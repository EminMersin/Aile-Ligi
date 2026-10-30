/**
 * "Haftanın meydan okuması" görev havuzu.
 *
 * {a} ve {b} yer tutucuları, seçilen aile üyelerinin "Ad(rol)" biçimiyle
 * değiştirilir (örnek: "Emin(baba) ve Yusuf(çocuk), ...").
 * İkili havuz aile en az 2 kişiyken, tekli havuz 1 kişiyken kullanılır.
 * Görevler ev içinde, ek malzeme gerektirmeden yapılabilecek şekilde seçildi.
 */

export const PAIR_CHALLENGES: readonly string[] = [
  '{a} ve {b}, evin içinde sessizce dans ederek gizli bir hikaye anlatsınlar!',
  '{a} ve {b}, 10 dakika içinde sessiz sinema ile en çok kelimeyi anlatmaya çalışsınlar!',
  '{a} ve {b}, evdeki eşyalarla 5 dakikada hayali bir müzik aleti tasarlasınlar!',
  '{a} ve {b}, hiç gülmeden 1 dakika boyunca birbirlerine komik bir hikaye anlatsınlar!',
  '{a} ve {b}, mutfaktan seçecekleri üç malzemeyle hayali bir tarif uydursunlar!',
  '{a} ve {b}, 20 dakikada evin en dağınık köşesini birlikte toplasınlar!',
  '{a} ve {b}, aile için yeni bir kural uydurup kağıda yazsınlar ve aileye sunsunlar!',
  '{a} ve {b}, sırayla birer cümle ekleyerek 10 cümlelik bir masal uydursunlar!',
  '{a} ve {b}, evin içinde 15 dakika boyunca en çok adım atma yarışı yapsınlar!',
  '{a} ve {b}, birbirlerinin en sevdiği yemeği hiç konuşmadan anlatsınlar!',
  '{a} ve {b}, evdeki beş eşyayı kullanarak bir dedektiflik hikayesi canlandırsınlar!',
  '{a} ve {b}, bir dakika boyunca sadece taklit yaparak sohbet etsinler!',
  '{a} ve {b}, en sevdikleri şarkıyı sözleri olmadan mırıldanıp diğerine buldursunlar!',
  '{a} ve {b}, kağıt ve kalemle aile için bir arma tasarlasınlar!',
  '{a} ve {b}, evin içinde üç ipuçlu küçük bir hazine avı hazırlasınlar!',
  '{a} ve {b}, birbirlerine üçer iltifat etsin ve nedenini anlatsınlar!',
  '{a} ve {b}, iki dakikada evdeki en komik pozu bulup birlikte fotoğraflansınlar!',
  '{a} ve {b}, ellerini kullanmadan gölge oyunu ile bir hayvan hikayesi anlatsınlar!',
  '{a} ve {b}, yağmurlu bir gün için beş maddelik bir eğlence listesi hazırlasınlar!',
  '{a} ve {b}, birbirlerinin yerine geçip iki dakika boyunca taklit yapsınlar!',
  '{a} ve {b}, evdeki en eski eşyayı bulup hikayesini uydursunlar!',
  '{a} ve {b}, 10 dakikada birlikte bir kule yapıp yıkmadan fotoğraflasınlar!',
  '{a} ve {b}, kendi gizli alfabelerini uydurup kendi isimlerini yazsınlar!',
  '{a} ve {b}, bir dakika boyunca sadece "miyav" ve "hav" diyerek anlaşmaya çalışsınlar!',
  '{a} ve {b}, aile için bir slogan ve bir selamlama hareketi uydursunlar!',
  '{a} ve {b}, mutfakta üç dakika içinde en çok turuncu eşyayı toplasınlar!',
  '{a} ve {b}, kağıttan uçak yapıp en uzağa uçurma yarışı yapsınlar!',
  '{a} ve {b}, birbirlerinin gününü üç soruyla öğrenip aileye özetlesinler!',
  '{a} ve {b}, evin krokisini çizip üzerinde bir hazine noktası işaretlesinler!',
  '{a} ve {b}, 15 dakika boyunca sadece fısıldayarak konuşsunlar!',
  '{a} ve {b}, bir hayvan seçip onun gözünden evi anlatan kısa bir öykü yazsınlar!',
  '{a} ve {b}, en sevdikleri üç şeyi birbirlerine anlatıp ortak bir liste yapsınlar!',
  '{a} ve {b}, sessizlik yarışması yapsınlar: ilk gülen kaybeder!',
  '{a} ve {b}, bir dakikada beş farklı duyguyu sadece yüz ifadesiyle anlatsınlar!',
  '{a} ve {b}, akşam yemeği için küçük bir gösteri hazırlayıp sunsunlar!',
  '{a} ve {b}, eski kıyafetlerle bir moda defilesi düzenleyip aileye göstersinler!',
  '{a} ve {b}, 10 dakikada evin en sessiz köşesini bulup orada birlikte kitap okusunlar!',
  '{a} ve {b}, hayali bir uzay gemisi tasarlayıp nereye gideceklerini anlatsınlar!',
  '{a} ve {b}, birbirlerine üç bilmece sorsun; bilemeyen bir sonraki turu başlatsın!',
  '{a} ve {b}, aynanın karşısında üç farklı hayvan taklidi yapıp birbirlerine göstersinler!',
  '{a} ve {b}, haftanın en güzel anını birlikte seçip aileye anlatsınlar!',
  '{a} ve {b}, kendilerine özel bir gizli el sıkışma uydursunlar!',
  '{a} ve {b}, üç dakikada doğaçlama bir tiyatro sahnesi oynasınlar!',
  '{a} ve {b}, birbirlerinin en sevdiği şarkıyı söyleyip birlikte dans etsinler!',
  '{a} ve {b}, "heykel ol" oyunu oynasınlar: 30 saniye kıpırdamayan kazanır!',
  '{a} ve {b}, aile için bir teşekkür kartı hazırlayıp birbirlerine versinler!',
];

export const SOLO_CHALLENGES: readonly string[] = [
  '{a}, evdeki beş eşyayı kullanarak kendi hikayesini anlatan kısa bir sahne hazırlasın!',
  '{a}, aileden birinin en sevdiği yemeği hiç konuşmadan anlatsın, diğerleri tahmin etsin!',
  '{a}, evin en sessiz köşesinde 10 dakika kitap okuyup en sevdiği cümleyi paylaşsın!',
  '{a}, bir hayvan taklidi yapıp ailenin onu bulmasını beklesin!',
  '{a}, kağıttan bir uçak yapıp en uzağa uçurmaya çalışsın!',
  '{a}, aile için küçük bir gösteri hazırlayıp akşam yemeğinde sunsun!',
  '{a}, üç bilmece uydurup sırayla aileye sorsun!',
  '{a}, evdeki en eski eşyayı bulup hikayesini ailesine anlatsın!',
  '{a}, kendine bir slogan ve bir selamlama hareketi uydursun!',
  '{a}, haftanın en güzel anını seçip ailesine anlatsın!',
];
