export const DISEASE_TR = {
  'Bacterial Spot':                      { tr: 'Bakteriyel Leke',              info: 'Pseudomonas/Xanthomonas bakterisinin neden olduğu kahverengi lekeler. Nem ve ıslaklıkta hızla yayılır.' },
  'Early Blight':                        { tr: 'Erken Yanıklık',               info: 'Alternaria solani mantarı. Koyu kahverengi halkalar içeren lekeler oluşturur, alt yapraklardan başlar.' },
  'Late Blight':                         { tr: 'Geç Yanıklık',                 info: 'Phytophthora infestans. Yapraklarda su emmiş görünümlü lekeler, beyaz küf tabakası oluşur.' },
  'Leaf Mold':                           { tr: 'Yaprak Küfü',                  info: 'Fulvia fulva mantarı. Yaprak altında sarımsı-kahverengi küf. Yüksek nemde sera bitkilerinde görülür.' },
  'Septoria Leaf Spot':                  { tr: 'Septoria Yaprak Lekesi',       info: 'Septoria lycopersici mantarı. Küçük dairevi lekeler, ortası açık kenarı koyu. Islaklıkla yayılır.' },
  'Spider Mites Two-spotted Spider Mite':{ tr: 'Kırmızı Örümcek',             info: 'Tetranychus urticae. Yaprak altında ince ağlar, sarımsı benekler. Sıcak ve kuru havada çoğalır.' },
  'Target Spot':                         { tr: 'Hedef Nokta Hastalığı',        info: 'Corynespora cassiicola mantarı. Halka halka büyüyen koyu lekeler. Yüksek nem ve ısıda görülür.' },
  'Tomato Yellow Leaf Curl Virus':       { tr: 'Sarı Yaprak Kıvırcık Virüsü', info: 'Beyazsinek vektörüyle yayılan virüs. Yapraklar sararır ve kıvrılır, meyve verimi düşer.' },
  'Tomato Mosaic Virus':                 { tr: 'Mozaik Virüsü',                info: 'Temas ve kontamine aletlerle yayılır. Yapraklarda mozaik renk deseni, biçim bozukluğu.' },
  'Powdery Mildew':                      { tr: 'Külleme',                      info: 'Uncinula/Erysiphe mantarı. Yapraklarda beyaz pudra görünümlü kaplama. Kuru ve sıcak havada görülür.' },
  'Downy Mildew':                        { tr: 'Mildiyö',                      info: 'Plasmopara mantarı. Yaprak üstünde sarı lekeler, altında grimsi-morumsu küf. Serin ve nemli havada görülür.' },
  'Black Rot':                           { tr: 'Siyah Çürüklük',               info: 'Guignardia bidwellii mantarı. Yapraklarda V şekilli sarı-kahverengi lekeler, meyvelerde siyah çürüme.' },
  'Cedar Apple Rust':                    { tr: 'Elma Pası',                    info: 'Gymnosporangium juniperi-virginianae mantarı. Yapraklarda turuncu lekeler ve tüp şekilli yapılar.' },
  'Common Rust':                         { tr: 'Yaygın Pas',                   info: 'Puccinia sorghi mantarı. Yapraklarda küçük kırmızı-kahverengi pustüller. Mısırda yaygındır.' },
  'Northern Leaf Blight':                { tr: 'Kuzey Yaprak Yanıklığı',       info: 'Exserohilum turcicum mantarı. Uzun gri-yeşil eliptik lekeler. Mısırda verim kaybına neden olur.' },
  'Cercospora Leaf Spot Gray Leaf Spot': { tr: 'Cercospora Yaprak Lekesi',     info: 'Cercospora zeae-maydis mantarı. Yapraklarda dar dikdörtgen gri lekeler. Yüksek nemde hızlı yayılır.' },
  'Haunglongbing Citrus Greening':       { tr: 'Turunçgil Yeşillik Hastalığı', info: 'Candidatus Liberibacter bakterisi. Yapraklarda asimetrik sararma, meyveler küçük ve yeşil kalır.' },
  'Bacterial Blight':                    { tr: 'Bakteriyel Yanıklık',          info: 'Pseudomonas syringae. Yapraklarda yağlı görünümlü lekeler, kahverengileşme, erken dökülme.' },
  'Leaf Blast':                          { tr: 'Yaprak Patlaması',             info: 'Magnaporthe oryzae mantarı. Eliptik gri lekeler. Pirinçte en yıkıcı hastalıklardan biridir.' },
  'Brown Spot':                          { tr: 'Kahverengi Leke',              info: 'Bipolaris oryzae mantarı. Kahverengi oval lekeler. Pirinçte tanelerin dökülmesine neden olur.' },
  'Healthy':                             { tr: 'Sağlıklı',                     info: 'Yaprak sağlıklı görünüyor. Herhangi bir hastalık belirtisi tespit edilmedi.' },
};

export function getDiseaseInfo(name) {
  if (!name) return null;
  const key = Object.keys(DISEASE_TR).find(k =>
    name.toLowerCase().includes(k.toLowerCase())
  );
  return key ? DISEASE_TR[key] : null;
}

export function translateDiseaseLabel(label) {
  if (!label) return label;
  // Format: "Bitki Adı — Disease Name" veya sadece "Disease Name"
  const parts = label.split(' — ');
  if (parts.length === 2) {
    const info = getDiseaseInfo(parts[1]);
    return info ? `${parts[0]} — ${info.tr}` : label;
  }
  const info = getDiseaseInfo(label);
  return info ? info.tr : label;
}
