/**
 * SORU SETİ
 * ---------------------------------------------------------------------------
 * Her cevap, matching.js içindeki buildVector() ile bir "özellik vektörüne"
 * dönüştürülür:
 *
 *   vector = {
 *     social:    [-1, 1]   // -1 = çok içe dönük, +1 = çok dışa dönük
 *     interests: Set/dizi  // 'tech' | 'art' | 'sport' | 'startup' | 'musicGame'
 *     style:     'listener' | 'talker' | 'funny'
 *     goal:      'network' | 'friend' | 'learn'
 *     dept:      string | null  // masada farklı bölümler karışsın diye
 *     fun:       string | null  // buz kırıcı önerisi için (skora etkisi yok)
 *   }
 *
 * Her sorunun `measures` alanı neyi ölçtüğünü, `contribution` alanı vektöre
 * nasıl katkı verdiğini açıklar. Cevap formatı:
 *   slider -> number (1..5) | cards -> option value | multi -> value[]
 */

export const INTERESTS = [
  { value: 'tech', label: 'Teknoloji', emoji: '🚀' },
  { value: 'art', label: 'Sanat / Tasarım', emoji: '🎨' },
  { value: 'sport', label: 'Spor', emoji: '⚽' },
  { value: 'startup', label: 'Girişimcilik', emoji: '💡' },
  { value: 'musicGame', label: 'Müzik / Oyun', emoji: '🎮' },
]

export const QUESTIONS = [
  {
    id: 'crowd',
    type: 'slider',
    emoji: '🫣',
    text: 'Tanımadığın bir kalabalığa girince ne hissedersin?',
    min: 1,
    max: 5,
    minLabel: 'Kaçacak yer arıyorum',
    maxLabel: 'Sahne benim!',
    // Ölçtüğü: sosyallik (içe dönük <-> dışa dönük)
    measures: 'sosyallik',
    // Katkı: (v-3)/2 -> [-1,1]; social = ağırlıklı ortalama (bu soru %40)
    contribution: 'social',
    weight: 0.4,
  },
  {
    id: 'starter',
    type: 'slider',
    emoji: '🗣️',
    text: 'Sohbeti genelde sen mi başlatırsın?',
    min: 1,
    max: 5,
    minLabel: 'Hiç',
    maxLabel: 'Hep ben',
    // Ölçtüğü: sosyallik (davranışsal yön)
    measures: 'sosyallik',
    // Katkı: (v-3)/2 -> [-1,1]; social ortalamasında %40
    contribution: 'social',
    weight: 0.4,
  },
  {
    id: 'interests',
    type: 'multi',
    emoji: '✨',
    text: 'Seni en çok ne heyecanlandırır?',
    hint: 'En fazla 2 tane seç',
    max: 2,
    options: INTERESTS,
    // Ölçtüğü: ilgi alanları — ortak ilgi bonusunun ana girdisi
    measures: 'ilgi alanı',
    // Katkı: seçilenler interests kümesine eklenir
    contribution: 'interests',
  },
  {
    id: 'style',
    type: 'cards',
    emoji: '💬',
    text: 'Sohbette hangisisin?',
    options: [
      { value: 'listener', label: 'Dinleyici', emoji: '👂' },
      { value: 'talker', label: 'Konuşkan', emoji: '🎤' },
      { value: 'funny', label: 'Espri odaklı', emoji: '😂' },
    ],
    // Ölçtüğü: sohbet tarzı — masada hepsi dinleyici olmasın
    measures: 'sohbet tarzı',
    // Katkı: style alanı (tarz çeşitliliği ufak bonus)
    contribution: 'style',
  },
  {
    id: 'goal',
    type: 'cards',
    emoji: '🎯',
    text: 'Bu etkinlikten en çok ne bekliyorsun?',
    options: [
      { value: 'network', label: 'Network', emoji: '🤝' },
      { value: 'friend', label: 'Arkadaşlık', emoji: '🫶' },
      { value: 'learn', label: 'Bilgi edinmek', emoji: '📚' },
    ],
    // Ölçtüğü: beklenti — aynı beklentiye sahip olanlar küçük bonus alır
    measures: 'beklenti',
    // Katkı: goal alanı
    contribution: 'goal',
  },
  {
    id: 'dept',
    type: 'cards',
    optional: true,
    emoji: '🎓',
    text: 'Hangi alandansın?',
    hint: 'İstersen atlayabilirsin',
    options: [
      { value: 'engineering', label: 'Mühendislik', emoji: '⚙️' },
      { value: 'business', label: 'İşletme / İktisat', emoji: '📈' },
      { value: 'design', label: 'Tasarım / Mimarlık', emoji: '📐' },
      { value: 'science', label: 'Fen / Sağlık', emoji: '🔬' },
      { value: 'social', label: 'Sosyal / Hukuk', emoji: '⚖️' },
      { value: 'other', label: 'Diğer', emoji: '🌈' },
    ],
    // Ölçtüğü: bölüm çeşitliliği — masada FARKLI bölümler karışsın
    measures: 'bölüm',
    // Katkı: dept alanı; masada zaten olan bölüm skoru düşürür (çeşitlilik bonusu)
    contribution: 'dept',
  },
  {
    id: 'friday',
    type: 'cards',
    emoji: '🌙',
    text: 'Cuma gecesi planın nedir?',
    options: [
      { value: 'home', label: 'Evde dizi & battaniye', emoji: '🛋️', social: -0.6 },
      { value: 'game', label: 'Oyun / müzik seansı', emoji: '🎧', social: -0.1 },
      { value: 'out', label: 'Dışarı, arkadaşlarla!', emoji: '🎉', social: 0.7 },
      { value: 'study', label: 'Ders / proje', emoji: '📖', social: -0.3 },
    ],
    // Ölçtüğü: enerji / sosyal tercih
    measures: 'enerji',
    // Katkı: seçeneğin `social` değeri, social ortalamasında %20 ağırlıkla
    contribution: 'social',
    weight: 0.2,
  },
  {
    id: 'drink',
    type: 'cards',
    emoji: '☕',
    text: 'Kafede ilk siparişin ne olur?',
    options: [
      { value: 'coffee', label: 'Filtre kahve', emoji: '☕' },
      { value: 'tea', label: 'Çay', emoji: '🫖' },
      { value: 'cold', label: 'Soğuk içecek', emoji: '🧋' },
      { value: 'energy', label: 'Enerji içeceği', emoji: '⚡' },
    ],
    // Ölçtüğü: sadece eğlence — buz kırıcı sorusunu kişiselleştirir
    measures: 'eğlence',
    // Katkı: fun alanı (eşleştirme skoruna etkisi YOK)
    contribution: 'fun',
  },
]

/** Bir sorunun cevabı geçerli mi? (opsiyonel sorular boş geçilebilir) */
export function isAnswered(question, value) {
  if (question.optional) return true
  if (question.type === 'multi') return Array.isArray(value) && value.length >= 1
  return value !== undefined && value !== null && value !== ''
}
