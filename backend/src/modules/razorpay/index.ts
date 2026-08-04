import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RazorpayProviderService from "./service"

const services = [RazorpayProviderService]

const razorpayModule = ModuleProvider(Modules.PAYMENT, {
  services,
})

export default razorpayModule