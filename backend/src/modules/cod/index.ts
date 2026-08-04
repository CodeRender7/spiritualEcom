import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CodPaymentProviderService from "./service"

const services = [CodPaymentProviderService]

const codModule = ModuleProvider(Modules.PAYMENT, {
  services,
})

export default codModule