import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { sessionRegistry, sendMessage, sendImage } from "../../../../../lib/whatsapp-session"

/**
 * Admin WhatsApp Catalog API
 * POST /admin/whatsapp/catalog/send → send product catalog to a customer
 * 
 * Body:
 * {
 *   sessionId: "was_abc123",
 *   to: "+919876543210",
 *   collectionId?: "col_123", // Optional: send collection specific catalog
 *   productIds?: ["prod_1", "prod_2"], // Optional: send customized catalog
 *   customNote?: "Special selection for you!"
 * }
 */

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { sessionId, to, collectionId, productIds, customNote } = req.body as {
    sessionId: string
    to: string
    collectionId?: string
    productIds?: string[]
    customNote?: string
  }

  if (!sessionId || !to?.trim()) {
    return res.status(400).json({ message: "Session ID and recipient phone are required" })
  }

  const session = sessionRegistry.get(sessionId)
  if (!session || session.status !== "connected") {
    return res.status(400).json({ message: "Connected WhatsApp session required" })
  }

  try {
    const productModule = req.scope.resolve(Modules.PRODUCT)
    let products: any[] = []

    if (productIds?.length) {
      products = await productModule.listProducts({ id: productIds })
    } else if (collectionId) {
      products = await productModule.listProducts({ collection_id: collectionId })
    } else {
      products = await productModule.listProducts({}, { take: 10 })
    }

    if (!products.length) {
      return res.status(404).json({ message: "No products found for catalog" })
    }

    // Send catalog header message
    const headerMsg = customNote 
      ? `Namaste! 🕉️ ${customNote}\n\nHere is our DivineKart catalog for you:`
      : `Namaste! 🕉️ Here is our curated DivineKart catalog:`

    await sendMessage(session.session_key, to, headerMsg)

    // Send individual product cards (limit to 5 to prevent spam)
    for (const prod of products.slice(0, 5)) {
      const price = prod.variants?.[0]?.prices?.[0]?.amount 
        ? `₹${Math.round(prod.variants[0].prices[0].amount)}`
        : "Contact for price"
      
      const text = `*${prod.title}*\n${price}\n\n${prod.description || "Handcrafted spiritual product"}\n\nOrder here: ${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:8000"}/products/${prod.handle}`

      if (prod.thumbnail) {
        await sendImage(session.session_key, to, prod.thumbnail, text)
      } else {
        await sendMessage(session.session_key, to, text)
      }
      
      // Delay between cards
      await new Promise(r => setTimeout(r, 1000))
    }

    return res.json({ success: true, count: Math.min(products.length, 5) })
  } catch (err) {
    console.error("WhatsApp catalog send failed:", err)
    return res.status(500).json({ message: "Failed to send catalog" })
  }
}
