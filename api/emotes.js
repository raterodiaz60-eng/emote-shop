// api/emotes.js
// Proxy para la API del catálogo de Roblox
// Ubicación: carpeta /api/ en tu repositorio de GitHub

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") return res.status(200).end()

    const { cursor } = req.query

    try {
        let url = `https://catalog.roblox.com/v1/search/items?category=Accessories&subcategory=Emotes&limit=30&sortType=2`
        if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.roblox.com/",
                "Origin": "https://www.roblox.com"
            }
        })

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Error contactando API de Roblox",
                status: response.status
            })
        }

        const data = await response.json()
        const ids = (data.data ?? []).map(i => i.id).filter(Boolean)

        if (!ids.length) {
            return res.status(200).json({ emotes: [], nextCursor: null })
        }

        const detailsRes = await fetch("https://catalog.roblox.com/v1/catalog/items/details", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Referer": "https://www.roblox.com/",
                "Origin": "https://www.roblox.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
                items: ids.map(id => ({ itemType: "Asset", id }))
            })
        })

        if (!detailsRes.ok) {
            return res.status(detailsRes.status).json({
                error: "Error obteniendo detalles",
                status: detailsRes.status
            })
        }

        const details = await detailsRes.json()

        const emotes = (details.data ?? []).map(item => ({
            id:          item.id,
            name:        item.name,
            price:       item.price ?? null,
            isForSale:   item.price != null,
            iconThumb:   `rbxthumb://type=Asset&id=${item.id}&w=150&h=150`,
            creatorName: item.creatorName ?? ""
        }))

        return res.status(200).json({
            emotes,
            nextCursor: data.nextPageCursor ?? null
        })

    } catch (err) {
        console.error("Proxy error:", err)
        return res.status(500).json({ error: err.message })
    }
}
