/** 參考室內設計估價單格式：工種套餐 + 可單獨選用的項目 */
export type DemoCatalogSeedItem = {
  name: string;
  unit: string;
  unit_price: number;
  category: string;
  keywords: string[];
  item_type: "single" | "package";
  package_lines?: { name: string; unit: string; quantity: number; unit_price: number }[];
};

export const DEMO_CATALOG_ITEMS: DemoCatalogSeedItem[] = [
  // —— 套餐（對應估價單各大工種）——
  {
    name: "木工工程套餐",
    unit: "式",
    unit_price: 0,
    category: "木工",
    keywords: ["木工", "天花", "隔間", "門片", "矽酸鈣"],
    item_type: "package",
    package_lines: [
      { name: "隔間牆（矽酸鈣板）", unit: "式", quantity: 1, unit_price: 32400 },
      { name: "平釘天花", unit: "坪", quantity: 9, unit_price: 3500 },
      { name: "門片＋門框", unit: "樘", quantity: 3, unit_price: 8500 },
      { name: "推拉門軌道", unit: "組", quantity: 2, unit_price: 4200 },
      { name: "窗套木作", unit: "式", quantity: 1, unit_price: 12000 },
      { name: "浴廁門片", unit: "樘", quantity: 1, unit_price: 6500 },
      { name: "線板踢腳", unit: "尺", quantity: 42, unit_price: 280 },
      { name: "細部收邊工資", unit: "式", quantity: 1, unit_price: 35440 },
    ],
  },
  {
    name: "泥作工程套餐",
    unit: "式",
    unit_price: 0,
    category: "泥作",
    keywords: ["泥作", "防水", "磁磚", "地坪", "門檻"],
    item_type: "package",
    package_lines: [
      { name: "地坪整平", unit: "坪", quantity: 14.5, unit_price: 1200 },
      { name: "防水施作（24h 閉水）", unit: "間", quantity: 1, unit_price: 8500 },
      { name: "牆地磁磚鋪貼工資", unit: "坪", quantity: 8, unit_price: 3200 },
      { name: "磁磚材料", unit: "坪", quantity: 8, unit_price: 1500 },
      { name: "排水孔蓋", unit: "式", quantity: 1, unit_price: 2200 },
      { name: "大理石門檻", unit: "式", quantity: 1, unit_price: 7500 },
    ],
  },
  {
    name: "廚房系統櫃套餐",
    unit: "式",
    unit_price: 0,
    category: "系統櫃",
    keywords: ["廚房", "流理台", "石英石", "水槽", "系統櫃"],
    item_type: "package",
    package_lines: [
      { name: "廚房流理台下櫃", unit: "公分", quantity: 195, unit_price: 150 },
      { name: "石英石檯面", unit: "公分", quantity: 210, unit_price: 180 },
      { name: "廚房壁櫃", unit: "公分", quantity: 165, unit_price: 150 },
      { name: "不鏽鋼水槽 W73", unit: "式", quantity: 1, unit_price: 8500 },
      { name: "BRAVAT 龍頭", unit: "式", quantity: 1, unit_price: 6200 },
      { name: "緩衝鉸鏈＋把手", unit: "式", quantity: 1, unit_price: 4800 },
      { name: "抽拉式置物籃", unit: "組", quantity: 2, unit_price: 1600 },
      { name: "瓦斯爐開孔＋收邊", unit: "式", quantity: 1, unit_price: 5000 },
    ],
  },
  {
    name: "客廳臥室系統櫃套餐",
    unit: "式",
    unit_price: 0,
    category: "系統櫃",
    keywords: ["鞋櫃", "餐櫃", "衣櫃", "客廳", "臥室"],
    item_type: "package",
    package_lines: [
      { name: "客廳中央鏤空鞋櫃", unit: "公分", quantity: 100, unit_price: 210 },
      { name: "餐廳餐櫃", unit: "公分", quantity: 120, unit_price: 195 },
      { name: "次臥開放衣櫃", unit: "公分", quantity: 95, unit_price: 221 },
    ],
  },
  // —— 單一項目（可個別帶入報價）——
  {
    name: "平釘天花",
    unit: "坪",
    unit_price: 3500,
    category: "木工",
    keywords: ["天花", "平釘", "木工"],
    item_type: "single",
  },
  {
    name: "防水施作（24h 閉水）",
    unit: "間",
    unit_price: 8500,
    category: "泥作",
    keywords: ["防水", "浴室", "閉水"],
    item_type: "single",
  },
  {
    name: "磁磚鋪貼工資",
    unit: "坪",
    unit_price: 3200,
    category: "泥作",
    keywords: ["磁磚", "泥作", "鋪貼"],
    item_type: "single",
  },
  {
    name: "石英石檯面",
    unit: "公分",
    unit_price: 180,
    category: "廚房",
    keywords: ["石英石", "檯面", "廚房"],
    item_type: "single",
  },
  {
    name: "隔間牆（矽酸鈣板）",
    unit: "式",
    unit_price: 32400,
    category: "木工",
    keywords: ["隔間", "矽酸鈣", "輕隔間"],
    item_type: "single",
  },
  {
    name: "大理石門檻",
    unit: "式",
    unit_price: 7500,
    category: "泥作",
    keywords: ["門檻", "大理石"],
    item_type: "single",
  },
  {
    name: "不鏽鋼水槽",
    unit: "式",
    unit_price: 8500,
    category: "廚房",
    keywords: ["水槽", "廚房"],
    item_type: "single",
  },
  {
    name: "緩衝鉸鏈升級",
    unit: "組",
    unit_price: 3200,
    category: "系統櫃",
    keywords: ["鉸鏈", "緩衝", "五金"],
    item_type: "single",
  },
];

export const DEMO_CATALOG_SUMMARY = {
  packages: DEMO_CATALOG_ITEMS.filter((i) => i.item_type === "package").length,
  singles: DEMO_CATALOG_ITEMS.filter((i) => i.item_type === "single").length,
  total: DEMO_CATALOG_ITEMS.length,
};
