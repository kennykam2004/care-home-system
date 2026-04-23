export const formatCurrency = (num: string | number | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '0.00';
  const cleanNum = typeof num === 'string' ? num.replace(/,/g, '') : num;
  const n = Number(cleanNum);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const simpToTradMap: Record<string, string> = {
  '陈': '陳', '张': '張', '刘': '劉', '郑': '鄭', '孙': '孫', '赵': '趙', '吴': '吳', '黄': '黃',
  '华': '華', '丽': '麗', '强': '強', '国': '國', '娇': '嬌', '荣': '榮', '冯': '馮', '杨': '楊',
  '朱': '朱', '许': '許', '邓': '鄧', '钟': '鍾', '韩': '韓', '唐': '唐', '罗': '羅', '梁': '梁',
  '宋': '宋', '叶': '葉', '萧': '蕭', '汪': '汪', '蒋': '蔣', '顾': '顧', '韦': '韋', '钱': '錢',
  '邹': '鄒', '马': '馬', '苏': '蘇', '齐': '齊', '贺': '賀', '严': '嚴', '乔': '喬', '龙': '龍',
  '万': '萬', '宝': '寶', '欢': '歡', '伟': '偉', '发': '發', '财': '財', '东': '東', '爱': '愛',
  '庆': '慶', '义': '義', '胜': '勝', '学': '學', '广': '廣', '亚': '亞', '伦': '倫', '进': '進',
  '达': '達', '辉': '輝', '跃': '躍', '远': '遠', '运': '運', '连': '連', '选': '選', '还': '還',
  '泽': '澤', '洁': '潔', '洋': '洋', '洲': '洲', '浑': '渾', '涛': '濤', '润': '潤', '涨': '漲',
  '涩': '澀', '涣': '渾', '涤': '潔', '涧': '澗', '淳': '淳', '添': '添', '清': '清',
  '渊': '淵', '渍': '滌', '渐': '漸', '渔': '漁', '渗': '滲', '温': '溫', '游': '遊', '湾': '灣'
};

export const normalizeChinese = (str: string): string => {
  if (!str) return '';
  return str.split('').map(char => simpToTradMap[char] || char).join('');
};

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
