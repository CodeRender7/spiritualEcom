import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import HyperswitchProviderService from "./service"

const services = [HyperswitchProviderService]

const hyperswitchModule = ModuleProvider(Modules.PAYMENT, {
  services,
})

export default hyperswitchModule