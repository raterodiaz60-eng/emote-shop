
// api/emotes.js
// Proxy para la API del catálogo de Roblox
// Despliega esto en Vercel — es gratuito

export default async function handler(req, res) {
    // CORS — permite peticiones desde Roblox
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    const { cursor } = req.query

    try {
        // Busca emotes en el catálogo de Roblox
        // subcategory=39 = Emotes en la API de Roblox
        let url = "https://catalog.roblox.com/v1/search/items?category=Accessories&subcategory=Emotes&limit=30&sortType=2&includeNotForSale=false"

        if (cursor) {
            url += `&cursor=${cursor}`
        }

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        })

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Error al contactar la API de Roblox",
                status: response.status
            })
        }

        const data = await response.json()

        // Obtiene los IDs para pedir detalles (precio, nombre, imagen)
        const ids = data.data?.map(item => item.id).filter(Boolean) ?? []

        if (ids.length === 0) {
            return res.status(200).json({ emotes: [], nextCursor: null })
        }

        // Pide detalles de cada emote (precio, nombre, etc.)
        const detailsRes = await fetch(
            `https://catalog.roblox.com/v1/catalog/items/details`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    items: ids.map(id => ({ itemType: "Asset", id }))
                })
            }
        )

        const detailsData = await detailsRes.json()

        // Limpia y formatea la respuesta
        const emotes = (detailsData.data ?? []).map(item => ({
            id:         item.id,
            name:       item.name,
            price:      item.price ?? null,
            isForSale:  item.price !== undefined && item.price !== null,
            icon:       `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=150&height=150&format=png`,
            iconThumb:  `rbxthumb://type=Asset&id=${item.id}&w=150&h=150`,
            creatorName: item.creatorName ?? "",
        }))

        return res.status(200).json({
            emotes,
            nextCursor: data.nextPageCursor ?? null
        })

    } catch (err) {
        console.error("Proxy error:", err)
        return res.status(500).json({ error: "Error interno del proxy", detail: err.message })
    }
}
