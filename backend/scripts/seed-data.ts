import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedData({ container }: ExecArgs) {
  console.log("🕉️  Seeding DivineKart Hindu Religious & Spiritual Store...");

  const storeModule = container.resolve(Modules.STORE);
  const productModule = container.resolve(Modules.PRODUCT);
  const regionModule = container.resolve(Modules.REGION);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const promotionModule = container.resolve(Modules.PROMOTION);

  // 1. Get or Create default Sales Channel
  console.log("🔹 Configuring Sales Channel...");
  let salesChannel;
  const channels = await salesChannelModule.listSalesChannels();
  if (channels.length > 0) {
    salesChannel = channels[0];
  } else {
    salesChannel = await salesChannelModule.createSalesChannels({
      name: "Default Sales Channel",
      description: "DivineKart Default Sales Channel",
    });
  }

  // 2. Get or Create default Store
  console.log("🔹 Configuring Store...");
  let store;
  const stores = await storeModule.listStores();
  if (stores.length > 0) {
    store = stores[0];
  } else {
    store = await storeModule.createStores({
      name: "DivineKart",
      supported_currencies: [{ currency_code: "inr", is_default: true }],
    });
  }

  // 2b. Get or Create default Publishable API Key (linked to the Sales Channel)
  console.log("🔹 Configuring Publishable API Key...");
  let apiKey;
  const existingKeys = await apiKeyModule.listApiKeys({ type: "publishable" });
  if (existingKeys.length > 0) {
    apiKey = existingKeys[0];
    console.log(`   Publishable key existing: ${apiKey.title}`);
  } else {
    const createdKeys = await apiKeyModule.createApiKeys([
      {
        title: "Default Store",
        type: "publishable",
        created_by: "seed",
      },
    ]);
    apiKey = createdKeys[0];
    console.log(`   Publishable key created: ${apiKey.title}`);
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [salesChannel.id],
    },
  });
  console.log(`   Publishable key linked to sales channel: ${salesChannel.name}`);

  // 3. Get or Create default Region (India / INR)
  console.log("🔹 Configuring Region...");
  let region;
  const regions = await regionModule.listRegions({ name: "India" });
  if (regions.length > 0) {
    region = regions[0];
  } else {
    region = await regionModule.createRegions({
      name: "India",
      currency_code: "inr",
      countries: ["in"],
    });
  }

  // 3b. Enable payment providers on the region (COD, Razorpay, System)
  console.log("🔹 Linking payment providers to Region...");
  const enabledProviders = ["pp_system_default", "pp_razorpay_razorpay", "pp_cod_cod"];
  const { result: updatedRegions } = await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: { payment_providers: enabledProviders },
    },
  });
  console.log(`   Region payment providers: ${updatedRegions[0]?.payment_providers?.length ?? 0} linked`);

  // 4. Create 10 Collections (Hindu Spiritual & Religious Categories)
  console.log("🔹 Seeding collections (10 categories)...");
  const categoriesData = [
    { title: "Religious Photos", handle: "religious-photos", icon: "🖼️" },
    { title: "God Image Keyrings", handle: "god-image-keyrings", icon: "🔑" },
    { title: "Spiritual Idols", handle: "spiritual-idols", icon: "🛕" },
    { title: "Spiritual Stickers", handle: "spiritual-stickers", icon: "✨" },
    { title: "Banners & Posters", handle: "banners-posters", icon: "📜" },
    { title: "Photo Frames", handle: "photo-frames", icon: "🖼️" },
    { title: "Handbills & Puja Invites", handle: "handbills", icon: "📨" },
    { title: "Spiritual Stationery", handle: "spiritual-stationery", icon: "📖" },
    { title: "Spiritual Flags (Dhwaja)", handle: "spiritual-flags", icon: "🚩" },
    { title: "Spiritual Clothing", handle: "spiritual-clothing", icon: "🥻" },
  ];

  const collectionsMap: Record<string, any> = {};
  for (const cat of categoriesData) {
    const existing = await productModule.listProductCollections({ handle: cat.handle });
    if (existing.length > 0) {
      collectionsMap[cat.handle] = existing[0];
      console.log(`   Collection existing: ${cat.title}`);
    } else {
      const created = await productModule.createProductCollections({
        title: cat.title,
        handle: cat.handle,
        metadata: { icon: cat.icon },
      });
      collectionsMap[cat.handle] = created;
      console.log(`   Collection created: ${cat.title}`);
    }
  }

  // 4b. Create 10 Product Categories (native Medusa taxonomy, mirrored from the collections)
  // so storefront filtering by category_id works via /store/products?category_id[]=...
  console.log("🔹 Seeding product categories (10 native taxonomy nodes)...");
  const categoriesMap: Record<string, any> = {};
  for (const cat of categoriesData) {
    const existing = await productModule.listProductCategories({ handle: cat.handle });
    if (existing.length > 0) {
      categoriesMap[cat.handle] = existing[0];
      console.log(`   Category existing: ${cat.title}`);
    } else {
      const created = await productModule.createProductCategories({
        name: cat.title,
        handle: cat.handle,
        is_active: true,
        is_internal: false,
        metadata: { icon: cat.icon },
      });
      categoriesMap[cat.handle] = created;
      console.log(`   Category created: ${cat.title}`);
    }
  }

  // 4c. Create Product Types (secondary taxonomy: material/format)
  console.log("🔹 Seeding product types...");
  const typesData = [
    "Print",
    "Keyring",
    "Idol",
    "Sticker",
    "Banner",
    "Frame",
    "Handbill",
    "Stationery",
    "Flag",
    "Clothing",
  ];
  const typesMap: Record<string, any> = {};
  for (const typeName of typesData) {
    const existing = await productModule.listProductTypes({ value: typeName });
    if (existing.length > 0) {
      typesMap[typeName] = existing[0];
      console.log(`   Type existing: ${typeName}`);
    } else {
      const created = await productModule.createProductTypes({ value: typeName });
      typesMap[typeName] = created;
      console.log(`   Type created: ${typeName}`);
    }
  }

  // 5. Seed 30+ Products (3 per Collection)
  console.log("🔹 Seeding products (30+ spiritual items)...");
  const productsData = [
    // Collection: Religious Photos
    {
      title: "Premium Ayodhya Ram Lalla HD Photo Print",
      handle: "ram-lalla-hd-photo",
      description: "High-definition photograph print of Ayodhya Ram Lalla with golden borders. Ideal for home altar or temple decoration.",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      collection_handle: "religious-photos",
      price: 299,
      mrp: 499,
      rating: 4.9,
      rating_count: 85,
    },
    {
      title: "Radha Krishna Eternal Love Art Print",
      handle: "radha-krishna-art-print",
      description: "Vibrant and spiritual depiction of Radha Krishna under the Kadamba tree. Printed on premium heavy cardstock.",
      thumbnail: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600",
      collection_handle: "religious-photos",
      price: 349,
      mrp: 599,
      rating: 4.8,
      rating_count: 42,
    },
    {
      title: "Shiva Meditating in Himalayas Matte Print",
      handle: "shiva-meditating-print",
      description: "Calm and peaceful meditating Lord Shiva print. Bring serene and positive vibes to your living room or meditation space.",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
      collection_handle: "religious-photos",
      price: 249,
      mrp: 399,
      rating: 4.7,
      rating_count: 67,
    },

    // Collection: God Image Keyrings
    {
      title: "Acrylic Lord Ganesha Protection Keyring",
      handle: "ganesha-acrylic-keyring",
      description: "Double-sided premium acrylic key chain featuring Lord Ganesha image. High-quality metal ring, rust-resistant.",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
      collection_handle: "god-image-keyrings",
      price: 99,
      mrp: 199,
      rating: 4.8,
      rating_count: 120,
    },
    {
      title: "Hanuman Chalisa Miniature Book Keychain",
      handle: "hanuman-chalisa-keychain",
      description: "A unique keyring containing a readable mini Hanuman Chalisa inside a golden metallic locket.",
      thumbnail: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600",
      collection_handle: "god-image-keyrings",
      price: 149,
      mrp: 299,
      rating: 4.9,
      rating_count: 310,
    },
    {
      title: "Maha Mrityunjaya Mantra Metal Keyring",
      handle: "mrityunjaya-mantra-keyring",
      description: "Engraved brass keyring with Shiva symbol on one side and the Maha Mrityunjaya mantra on the other.",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
      collection_handle: "god-image-keyrings",
      price: 129,
      mrp: 249,
      rating: 4.6,
      rating_count: 53,
    },

    // Collection: Spiritual Idols
    {
      title: "Handcrafted Brass Lord Ganesha Idol (6-inch)",
      handle: "brass-ganesha-idol-6in",
      description: "Heavy brass idol of Lord Ganesha in seated posture. Excellent craftsmanship with fine details for home mandir.",
      thumbnail: "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=600",
      collection_handle: "spiritual-idols",
      price: 1299,
      mrp: 1999,
      rating: 4.9,
      rating_count: 142,
    },
    {
      title: "Marble Dust Shri Krishna Playing Flute Murti",
      handle: "krishna-flute-murti",
      description: "Exquisite white marble dust murti of Laddu Gopal / Krishna playing flute with gold accents.",
      thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
      collection_handle: "spiritual-idols",
      price: 1599,
      mrp: 2499,
      rating: 4.8,
      rating_count: 98,
    },
    {
      title: "Meditating Shiva Dhyana Mudra Resin Statue",
      handle: "shiva-dhyana-resin-statue",
      description: "Perfect dark grey resin statue of Lord Shiva in Dhyana posture. Beautifully fits car dashboard or office desk.",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
      collection_handle: "spiritual-idols",
      price: 499,
      mrp: 799,
      rating: 4.7,
      rating_count: 215,
    },

    // Collection: Spiritual Stickers
    {
      title: "Auspicious Swastik & Om Foil Car Stickers",
      handle: "swastik-om-car-stickers",
      description: "Set of 4 gold-foiled reflective stickers featuring Om and Swastik symbols. Weatherproof for car dashboard and glass.",
      thumbnail: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600",
      collection_handle: "spiritual-stickers",
      price: 99,
      mrp: 199,
      rating: 4.8,
      rating_count: 340,
    },
    {
      title: "Jai Shri Ram Car Rear Glass Vinyl Decal",
      handle: "jai-shri-ram-vinyl-decal",
      description: "Bold saffron color vinyl transfer sticker of Jai Shri Ram slogan with Hanuman silhouette. Easy to apply.",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      collection_handle: "spiritual-stickers",
      price: 149,
      mrp: 299,
      rating: 4.9,
      rating_count: 512,
    },
    {
      title: "Siddhivinayak Ganesha Holographic Laptop Skin",
      handle: "siddhivinayak-holographic-laptop-skin",
      description: "Vinyl holographic cut-out sticker of Lord Ganesha for laptop lid. Scratch-resistant, residue-free removal.",
      thumbnail: "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=600",
      collection_handle: "spiritual-stickers",
      price: 199,
      mrp: 399,
      rating: 4.7,
      rating_count: 88,
    },

    // Collection: Banners & Posters
    {
      title: "Velvet Chowki Altar Banner with Golden Zari",
      handle: "velvet-chowki-banner-zari",
      description: "Red velvet altar cloth banner embroidered with auspicious Shubha Labha and Swastik symbols. Zari border finish.",
      thumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600",
      collection_handle: "banners-posters",
      price: 399,
      mrp: 699,
      rating: 4.6,
      rating_count: 34,
    },
    {
      title: "Large Hanuman Chalisa Wall Scroll Banner",
      handle: "hanuman-chalisa-scroll-banner",
      description: "Silk scroll banner printed with full Hanuman Chalisa in clear Hindi Devanagari text. Ready to hang.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "banners-posters",
      price: 499,
      mrp: 899,
      rating: 4.9,
      rating_count: 110,
    },
    {
      title: "Durga Puja Welcome Banner (Satin Fabric)",
      handle: "durga-puja-welcome-banner",
      description: "Highly durable satin fabric banner with Goddess Durga image for community pandals or home entrance.",
      thumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600",
      collection_handle: "banners-posters",
      price: 299,
      mrp: 499,
      rating: 4.8,
      rating_count: 23,
    },

    // Collection: Photo Frames
    {
      title: "Gold Embossed Ganesha wooden Photo Frame",
      handle: "gold-ganesha-wooden-frame",
      description: "Double mount synthetic wood photo frame featuring gold-embossed Ganesha. Transparent acrylic protection front.",
      thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
      collection_handle: "photo-frames",
      price: 699,
      mrp: 1199,
      rating: 4.9,
      rating_count: 115,
    },
    {
      title: "Sri Yantra 3D Gold Foil Frame for Vastu",
      handle: "sri-yantra-gold-foil-frame",
      description: "Sacred geometry Sri Chakra / Sri Yantra gold foil frame. Purifies energy flow and brings wealth according to Vastu.",
      thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
      collection_handle: "photo-frames",
      price: 899,
      mrp: 1499,
      rating: 4.8,
      rating_count: 73,
    },
    {
      title: "Radha Krishna Flute Melodies Classic Photo Frame",
      handle: "radha-krishna-classic-frame",
      description: "Classic brown wooden frame showcasing Radha Krishna. Ideal wedding or housewarming gift.",
      thumbnail: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600",
      collection_handle: "photo-frames",
      price: 599,
      mrp: 999,
      rating: 4.7,
      rating_count: 62,
    },

    // Collection: Handbills & Puja Invites
    {
      title: "Ganesh Chaturthi Invitation Handbills (Pack of 50)",
      handle: "ganesh-chaturthi-invites-50",
      description: "Premium paper invitation cards for Ganesh Chaturthi puja with decorative borders and text guides.",
      thumbnail: "https://images.unsplash.com/photo-1567591416348-18e3c3b01859?w=600",
      collection_handle: "handbills",
      sale_type: "both", // recurring puja invites → subscription eligible (T8)
      price: 249,
      mrp: 499,
      rating: 4.7,
      rating_count: 19,
    },
    {
      title: "Satyanarayan Katha Puja Card Leaflets (Pack of 20)",
      handle: "satyanarayan-katha-cards-20",
      description: "Handy leaflets containing the steps and mantra guides for Lord Satyanarayan Vrat Katha Puja.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "handbills",
      sale_type: "both",
      price: 149,
      mrp: 299,
      rating: 4.8,
      rating_count: 31,
    },
    {
      title: "Customizable Diwali Puja Vidhi Pamphlets (Pack of 100)",
      handle: "diwali-puja-vidhi-pamphlets",
      description: "Pamphlets containing step-by-step Lakshmi Puja rituals and mantras to distribute to community members.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "handbills",
      sale_type: "both",
      price: 399,
      mrp: 799,
      rating: 4.6,
      rating_count: 14,
    },

    // Collection: Spiritual Stationery
    {
      title: "Bhagavad Gita Hardcover Journal with Quote Bookmark",
      handle: "bhagavad-gita-journal",
      description: "Handmade eco-friendly diary featuring gold metallic embossing of Gita verses. Includes a silk tassel bookmark.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "spiritual-stationery",
      price: 349,
      mrp: 599,
      rating: 4.9,
      rating_count: 94,
    },
    {
      title: "Premium Hindu Panchang & Calendar 2026",
      handle: "hindu-panchang-calendar-2026",
      description: "Detailed daily wall calendar featuring auspicious tithis, nakshatras, rahu kala, and festival listings.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "spiritual-stationery",
      price: 199,
      mrp: 299,
      rating: 4.8,
      rating_count: 156,
    },
    {
      title: "Mantra Writing Practice Notebook (Pack of 3)",
      handle: "mantra-writing-notebook-3",
      description: "Ruled notebooks specifically designed to write 'Rama' or 'Om' 108 times daily. Promotes mental peace and focus.",
      thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600",
      collection_handle: "spiritual-stationery",
      price: 149,
      mrp: 249,
      rating: 4.9,
      rating_count: 220,
    },

    // Collection: Spiritual Flags (Dhwaja)
    {
      title: "Triangular Saffron Jai Shri Ram Rooftop Flag",
      handle: "saffron-jai-shri-ram-flag",
      description: "High-grade weather-proof satin triangular saffron flag featuring Lord Hanuman silhouette and slogan. Size: 3x4 ft.",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      collection_handle: "spiritual-flags",
      sale_type: "both", // temple flags need seasonal replacement → subscription eligible (T8)
      price: 249,
      mrp: 499,
      rating: 4.9,
      rating_count: 312,
    },
    {
      title: "Red Lord Hanuman Gada Temple Flag",
      handle: "red-hanuman-gada-flag",
      description: "Auspicious red satin flag featuring Hanuman Gada graphic. Perfect for local temples and household entrance towers.",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      collection_handle: "spiritual-flags",
      sale_type: "both",
      price: 199,
      mrp: 399,
      rating: 4.8,
      rating_count: 142,
    },
    {
      title: "Om Triangular Saffron Pataka (Hand Flags Pack of 5)",
      handle: "om-pataka-hand-flags-5",
      description: "Set of 5 small saffron flags with Om symbol print and plastic sticks for religious rallies and shobha yatras.",
      thumbnail: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      collection_handle: "spiritual-flags",
      sale_type: "both",
      price: 129,
      mrp: 249,
      rating: 4.7,
      rating_count: 65,
    },

    // Collection: Spiritual Clothing
    {
      title: "Sanskrit Shloka Printed Pure Silk Puja Stole",
      handle: "sanskrit-shloka-silk-stole",
      description: "Auspicious yellow silk shawl (Pitambari dupatta) printed with holy chants. Worn during havan and daily prayers.",
      thumbnail: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600",
      collection_handle: "spiritual-clothing",
      price: 599,
      mrp: 999,
      rating: 4.9,
      rating_count: 76,
    },
    {
      title: "Men's Cotton Dhoti & Angavastram Havan Set",
      handle: "cotton-dhoti-angavastram-set",
      description: "Premium pure white cotton dhoti with traditional red border, paired with matching shoulder cloth (Angavastram).",
      thumbnail: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600",
      collection_handle: "spiritual-clothing",
      price: 799,
      mrp: 1299,
      rating: 4.8,
      rating_count: 53,
    },
    {
      title: "Embroidered Rudraksha Kurta for Men",
      handle: "embroidered-rudraksha-kurta",
      description: "Saffron color short kurta made of cotton linen, featuring subtle Rudraksha embroidery on collar and cuffs.",
      thumbnail: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600",
      collection_handle: "spiritual-clothing",
      price: 999,
      mrp: 1699,
      rating: 4.9,
      rating_count: 180,
    }
  ];

  const newProducts: any[] = [];
  const publishIds: string[] = [];
  const updateExisting: { id: string; categoryIds: string[]; typeId?: string; metadata?: Record<string, any> }[] = [];
  for (const prod of productsData) {
    const existing = await productModule.listProducts({ handle: prod.handle });
    if (existing.length > 0) {
      const existingProduct = existing[0];
      if (existingProduct.status !== "published") {
        publishIds.push(existingProduct.id);
      }
      // Ensure existing products also carry their taxonomy links (categories/types
      // created above may not have existed when the product was first seeded).
      const collection = collectionsMap[prod.collection_handle];
      const category = categoriesMap[prod.collection_handle];
      const typeName =
        typesData.find((t) => collection?.title?.toLowerCase().includes(t.toLowerCase())) || typesData[0];
      // Backfill sale_type metadata so re-seeding upgrades previously-seeded products (T8).
      const existingMetadata = (existingProduct.metadata ?? {}) as Record<string, any>;
      const desiredSaleType = prod.sale_type ?? "one_time";
      if (existingMetadata.sale_type !== desiredSaleType) {
        updateExisting.push({
          id: existingProduct.id,
          categoryIds: category ? [category.id] : [],
          typeId: typesMap[typeName]?.id,
          metadata: { ...existingMetadata, sale_type: desiredSaleType },
        });
      } else {
        updateExisting.push({
          id: existingProduct.id,
          categoryIds: category ? [category.id] : [],
          typeId: typesMap[typeName]?.id,
        });
      }
      console.log(`   Product existing: ${prod.title}`);
      continue;
    }

    const collection = collectionsMap[prod.collection_handle];
    if (!collection) {
      console.log(`⚠️  Warning: Collection not found for handle: ${prod.collection_handle}`);
      continue;
    }

    const category = categoriesMap[prod.collection_handle];
    if (!category) {
      console.log(`⚠️  Warning: Category not found for handle: ${prod.collection_handle}`);
      continue;
    }

    // Map each collection → its primary product type (collection name doubles as the type value)
    const typeName = typesData.find((t) => collection.title.toLowerCase().includes(t.toLowerCase())) || typesData[0];
    const type = typesMap[typeName];

    newProducts.push({
      title: prod.title,
      handle: prod.handle,
      description: prod.description,
      thumbnail: prod.thumbnail,
      status: "published",
      collection_id: collection.id,
      category_ids: [category.id],
      type_id: type?.id,
      sales_channels: [{ id: salesChannel.id }],
      options: [{ title: "StandardOption", values: ["StandardValue"] }],
      variants: [
        {
          title: "Standard",
          options: { StandardOption: "StandardValue" },
          prices: [
            {
              currency_code: "inr",
              amount: prod.price * 100, // store in minor units (paise)
            },
          ],
        },
      ],
      metadata: {
        mrp: prod.mrp * 100, // minor units (paise), consistent with variant prices
        discount_pct: Math.round(((prod.mrp - prod.price) / prod.mrp) * 100),
        rating: prod.rating,
        rating_count: prod.rating_count,
        is_deal: prod.price < 500, // automatic flag
        is_trending: prod.rating_count > 100,
        sale_type: prod.sale_type ?? "one_time", // one_time | both (T8 sale-type model)
      },
    });
  }

  if (newProducts.length > 0) {
    console.log(`🔹 Creating ${newProducts.length} products via workflow...`);
    const { result } = await createProductsWorkflow(container).run({
      input: { products: newProducts },
    });
    console.log(`   Workflow result products: ${result?.length ?? 0}`);
  } else {
    console.log("   No new products to create.");
  }

  if (updateExisting.length > 0) {
    console.log(`🔹 Linking taxonomy to ${updateExisting.length} existing products...`);
    for (const p of updateExisting) {
      await productModule.updateProducts(
        { id: p.id },
        {
          category_ids: p.categoryIds,
          type_id: p.typeId,
          ...(p.metadata ? { metadata: p.metadata } : {}),
        }
      );
    }
    console.log("   Taxonomy links applied.");
  }

  if (publishIds.length > 0) {
    console.log(`🔹 Publishing ${publishIds.length} existing draft products...`);
    await productModule.updateProducts({ id: publishIds }, { status: "published" });
  }

  // 7. Real promotions — DIVINE10 (10% off, code applied at checkout)
  console.log("🔹 Seeding real promotions (DIVINE10)...");
  const existingPromos = await promotionModule.listPromotions({ code: "DIVINE10" });
  if (existingPromos.length > 0) {
    console.log("   Promotion DIVINE10 existing — skipping.");
  } else {
    await promotionModule.createPromotions({
      code: "DIVINE10",
      type: "standard",
      is_automatic: false,
      status: "active",
      application_method: {
        type: "percentage",
        target_type: "order",
        allocation: "across",
        value: 10,
      },
    });
    console.log("   Promotion DIVINE10 created (10% off, code required).");
  }

  console.log("✅ Seed completed successfully!");
}
