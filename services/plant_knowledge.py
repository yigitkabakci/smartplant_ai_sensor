"""
Ev Bitkisi Bilgi Tabanı
========================
Her bitki türü için optimal sensör aralıkları ve yaygın sorunlar.
Sensör verileriyle birleştirilerek akıllı teşhis üretilir.
"""

from typing import Optional

# ------------------------------------------------------------------
# Bitki Bilgi Tabanı
# ------------------------------------------------------------------
# Her bitki için:
#   keywords   : model label eşleştirmesi için anahtar kelimeler
#   optimal    : (min, max) tuple — sensör değerleri bu aralıkta sağlıklı
#   problems   : sensör koşuluna göre tetiklenen sorunlar
# ------------------------------------------------------------------

PLANTS: dict = {
    "monstera": {
        "display_name": "Monstera",
        "keywords": ["monstera", "swiss cheese", "monstera deliciosa", "monstera adansonii"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (18, 27),
            "humidity":    (50, 80),
            "light":       (1000, 10000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Yumuşak gövde", "Kötü toprak kokusu"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst 3-4 cm'si kuruyunca sulayın. Drenaj deliğini kontrol edin.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Sarkık yapraklar", "Kahverengi yaprak uçları", "Kuru toprak"],
                "metric": "moisture", "op": "lt", "threshold": 30,
                "recommendation": "Toprağı iyice sulayın, fazla suyun drenaj deliğinden çıkmasını bekleyin.",
                "severity": "warning",
            },
            {
                "name": "Düşük Hava Nemi",
                "symptoms": ["Kahverengi yaprak uçları", "Kıvrılmış yapraklar"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Günde 1-2 kez yaprakları sislendirin veya yanına su dolu kap koyun.",
                "severity": "info",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Soluk yapraklar", "Küçük yeni yapraklar", "Yavaş büyüme"],
                "metric": "light", "op": "lt", "threshold": 500,
                "recommendation": "Doğu veya kuzey pencere kenarına taşıyın. Doğrudan güneş ışığından kaçının.",
                "severity": "info",
            },
            {
                "name": "Aşırı Sıcaklık",
                "symptoms": ["Sarkık yapraklar", "Kahverengi lekeler"],
                "metric": "temperature", "op": "gt", "threshold": 30,
                "recommendation": "Saksıyı serin ve havadar bir yere taşıyın, klima veya radyatörden uzak tutun.",
                "severity": "warning",
            },
        ],
    },

    "pothos": {
        "display_name": "Pothos (Devil's Ivy)",
        "keywords": ["pothos", "devil", "epipremnum", "epipremnum aureum", "scindapsus", "efemera"],
        "optimal": {
            "moisture":    (30, 60),
            "temperature": (15, 30),
            "humidity":    (40, 70),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Kök Çürüklüğü",
                "symptoms": ["Sarı yapraklar", "Siyahlaşan gövde", "Kötü koku"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Sulamayı hemen durdurun. Kök çürüklüğü şüphesinde bitkiyi saksıdan çıkarıp kökleri kontrol edin.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Solan yapraklar", "Sarkık dallar"],
                "metric": "moisture", "op": "lt", "threshold": 25,
                "recommendation": "Toprağı iyice sulayın. Pothos suya dayanıklıdır ama tamamen kurumaktan kaçının.",
                "severity": "warning",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Kahverengi lekeler", "Büyüme durması"],
                "metric": "temperature", "op": "lt", "threshold": 12,
                "recommendation": "Saksıyı pencereden uzaklaştırın, minimum 15°C ortam sağlayın.",
                "severity": "warning",
            },
        ],
    },

    "ficus": {
        "display_name": "Ficus (İncir Ağacı)",
        "keywords": ["ficus", "fig", "benjamina", "weeping fig", "ficus benjamina", "ficus lyrata", "fiddle leaf"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (16, 24),
            "humidity":    (50, 70),
            "light":       (2000, 10000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Yaprak dökümü", "Sarı yapraklar", "Küf"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Sulamayı azaltın, toprağın kuruma sürecini hızlandırmak için saksı drenajını iyileştirin.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Yaprak dökümü", "Soluk renkli yapraklar"],
                "metric": "light", "op": "lt", "threshold": 1500,
                "recommendation": "Parlak dolaylı ışık alan pencere önüne taşıyın. Ficus yer değişikliğine hassastır.",
                "severity": "warning",
            },
            {
                "name": "Soğuk Hava",
                "symptoms": ["Yaprak dökümü", "Sarı yapraklar"],
                "metric": "temperature", "op": "lt", "threshold": 13,
                "recommendation": "Sıcaklığı 16°C üzerinde tutun. Soğuk pencere camlarından uzak tutun.",
                "severity": "critical",
            },
        ],
    },

    "dracaena": {
        "display_name": "Dracaena",
        "keywords": ["dracaena", "dragon tree", "corn plant", "dracaena fragrans", "dracaena marginata", "dracaena trifasciata"],
        "optimal": {
            "moisture":    (30, 50),
            "temperature": (18, 27),
            "humidity":    (40, 60),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı ve yumuşak yapraklar", "Kahverengi gövde tabanı"],
                "metric": "moisture", "op": "gt", "threshold": 60,
                "recommendation": "Dracaena az sulama ister. Toprağın yarısı kuruyunca sulayın.",
                "severity": "warning",
            },
            {
                "name": "Flor/Klor Zararı",
                "symptoms": ["Yaprak uçlarında kahverengi yanma"],
                "metric": "humidity", "op": "lt", "threshold": 30,
                "recommendation": "Musluk suyu yerine bekletilmiş veya filtreli su kullanın. Nem artırın.",
                "severity": "info",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Soluk ve dar yapraklar", "Yavaş büyüme"],
                "metric": "light", "op": "lt", "threshold": 300,
                "recommendation": "Daha aydınlık bir konuma taşıyın, ancak doğrudan güneş ışığından kaçının.",
                "severity": "info",
            },
        ],
    },

    "orchid": {
        "display_name": "Orkide (Phalaenopsis)",
        "keywords": ["orchid", "phalaenopsis", "orkide", "orchidaceae", "cattleya", "dendrobium"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (18, 29),
            "humidity":    (50, 80),
            "light":       (5000, 25000),
        },
        "problems": [
            {
                "name": "Kök Çürüklüğü",
                "symptoms": ["Kahverengi/siyah kökler", "Sarı yapraklar", "Gevşek kökler"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Çürük kökleri kesin. Orkideyi saksıdan çıkarıp kökleri havalandırın. Haftada 1 sulama yeterli.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Nem",
                "symptoms": ["Kırışık yapraklar", "Büzülmüş kökler"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Nem tepsisi kullanın veya sislendirin. Orkide %50-70 nem ister.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Çiçek açmama", "Koyu yeşil yapraklar"],
                "metric": "light", "op": "lt", "threshold": 3000,
                "recommendation": "Doğu veya batı yönlü pencere önüne taşıyın. Doğrudan güneş ışığından kaçının.",
                "severity": "info",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Çiçek dökümü", "Mor renk değişimi"],
                "metric": "temperature", "op": "lt", "threshold": 15,
                "recommendation": "Ortam sıcaklığını 18°C üzerinde tutun. Soğuk havalarda pencereden uzaklaştırın.",
                "severity": "warning",
            },
        ],
    },

    "aloe_vera": {
        "display_name": "Aloe Vera",
        "keywords": ["aloe", "aloe vera", "aloe barbadensis"],
        "optimal": {
            "moisture":    (15, 35),
            "temperature": (18, 30),
            "humidity":    (20, 50),
            "light":       (5000, 30000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama (En Yaygın Sorun)",
                "symptoms": ["Şeffaf/yumuşak yapraklar", "Kahverengi gövde tabanı", "Kötü koku"],
                "metric": "moisture", "op": "gt", "threshold": 45,
                "recommendation": "Sulamayı hemen durdurun. Toprak tamamen kuruyunca sulayın (2-4 haftada bir). İyi drenajlı saksı şarttır.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Soluk renk", "İnce uzun yapraklar", "Eğilme"],
                "metric": "light", "op": "lt", "threshold": 3000,
                "recommendation": "Aloe Vera bol ışık ister. Güneye bakan pencere önüne taşıyın.",
                "severity": "warning",
            },
            {
                "name": "Soğuk Hasar",
                "symptoms": ["Kahverengi yumuşak yapraklar", "Don hasarı"],
                "metric": "temperature", "op": "lt", "threshold": 10,
                "recommendation": "Aloe Vera dondan zarar görür. Kışın pencereden uzak tutun, minimum 10°C.",
                "severity": "critical",
            },
        ],
    },

    "spider_plant": {
        "display_name": "Örümcek Bitkisi (Chlorophytum)",
        "keywords": ["spider", "chlorophytum", "chlorophytum comosum", "airplane"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (13, 27),
            "humidity":    (40, 70),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Kahverengi/yumuşak yaprak tabanları", "Kök çürüklüğü"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst yarısı kuruyunca sulayın.",
                "severity": "warning",
            },
            {
                "name": "Flor Zararı",
                "symptoms": ["Yaprak uçlarında kahverengi yanma"],
                "metric": "humidity", "op": "lt", "threshold": 30,
                "recommendation": "Bekletilmiş su kullanın. Yaprak uçlarının yanması genellikle florun etkisidir.",
                "severity": "info",
            },
        ],
    },

    "philodendron": {
        "display_name": "Filodendron (Philodendron)",
        "keywords": ["philodendron", "filodendron", "heartleaf", "philodendron hederaceum", "philodendron scandens"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (18, 29),
            "humidity":    (50, 80),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Yumuşak gövde"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst 2-3 cm'si kuruyunca sulayın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Nem",
                "symptoms": ["Kıvrılmış yapraklar", "Kahverengi uçlar"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Günlük sislendirin veya nem tepsisi kullanın.",
                "severity": "info",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Büyüme durması", "Kahverengi lekeler"],
                "metric": "temperature", "op": "lt", "threshold": 13,
                "recommendation": "Sıcaklığı 18°C üzerinde tutun. Soğuk hava akımlarından koruyun.",
                "severity": "warning",
            },
        ],
    },

    "zz_plant": {
        "display_name": "ZZ Bitkisi (Zamioculcas)",
        "keywords": ["zamioculcas", "zamioculcas zamiifolia", "zz plant", "zz bitkisi", "zanzibar"],
        "optimal": {
            "moisture":    (20, 40),
            "temperature": (15, 30),
            "humidity":    (30, 60),
            "light":       (500, 3000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama (Kritik)",
                "symptoms": ["Sarı yapraklar", "Gövde tabanında çürüme"],
                "metric": "moisture", "op": "gt", "threshold": 50,
                "recommendation": "ZZ bitkisi çok az su ister. Ayda 1-2 kez sulama yeterlidir. Rizomları çürümeden kurtarın.",
                "severity": "critical",
            },
            {
                "name": "Çok Düşük Işık",
                "symptoms": ["Yavaş büyüme (normal)", "Soluk renk"],
                "metric": "light", "op": "lt", "threshold": 200,
                "recommendation": "ZZ bitkisi düşük ışığa dayanıklıdır ama tamamen karanlıkta büyüyemez.",
                "severity": "info",
            },
        ],
    },

    "jade_plant": {
        "display_name": "Jade Bitkisi (Crassula)",
        "keywords": ["jade", "crassula", "money plant", "jade plant"],
        "optimal": {
            "moisture":    (20, 40),
            "temperature": (15, 27),
            "humidity":    (30, 50),
            "light":       (5000, 20000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Şişkin/yumuşak yapraklar", "Yaprak dökümü"],
                "metric": "moisture", "op": "gt", "threshold": 50,
                "recommendation": "Toprak tamamen kuruyunca sulayın. Kışın ayda 1 kez yeterli.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Uzun ince dallar (etiolation)", "Soluk yapraklar"],
                "metric": "light", "op": "lt", "threshold": 3000,
                "recommendation": "Güneye bakan pencere önüne taşıyın. Günde 4+ saat ışık gerekir.",
                "severity": "warning",
            },
        ],
    },

    "succulent": {
        "display_name": "Sukulent / Echeveria",
        "keywords": ["succulent", "echeveria", "haworthia", "sedum", "sukulent"],
        "optimal": {
            "moisture":    (15, 30),
            "temperature": (18, 27),
            "humidity":    (20, 40),
            "light":       (10000, 40000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Şeffaf şişkin yapraklar", "Kahverengi yumuşak dip"],
                "metric": "moisture", "op": "gt", "threshold": 40,
                "recommendation": "Toprak tamamen kurumadan sulamayın. Kış aylarında ayda 1 kez yeterli.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Uzama (etiolation)", "Soluk renk kaybı"],
                "metric": "light", "op": "lt", "threshold": 5000,
                "recommendation": "Succulentler bol ışık ister. Grow lamp kullanabilirsiniz.",
                "severity": "warning",
            },
            {
                "name": "Yüksek Nem",
                "symptoms": ["Küf", "Çürüme"],
                "metric": "humidity", "op": "gt", "threshold": 60,
                "recommendation": "Succulentler kuru havayı sever. Havalandırmayı artırın.",
                "severity": "warning",
            },
        ],
    },

    "tradescantia": {
        "display_name": "Tradescantia",
        "keywords": ["tradescantia", "spiderwort", "wandering"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (15, 25),
            "humidity":    (40, 70),
            "light":       (1000, 5000),
        },
        "problems": [
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Renk solması (mor/gümüş renk kaybolur)", "Yavaş büyüme"],
                "metric": "light", "op": "lt", "threshold": 500,
                "recommendation": "Parlak dolaylı ışık verin. Daha aydınlık konuma taşıyın.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Çürüme", "Sarı yapraklar"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst kısmı kuruyunca sulayın.",
                "severity": "warning",
            },
        ],
    },

    "schefflera": {
        "display_name": "Schefflera (Şemsiye Bitkisi)",
        "keywords": ["schefflera", "umbrella", "dwarf umbrella", "schefflera actinophylla", "heptapleurum"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (15, 24),
            "humidity":    (50, 70),
            "light":       (2000, 8000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Yaprak dökümü", "Sarı yapraklar"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst yarısı kuruyunca sulayın. Kışın sulamayı azaltın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Uzama", "Yaprak dökümü"],
                "metric": "light", "op": "lt", "threshold": 1000,
                "recommendation": "Daha parlak bir konuma taşıyın.",
                "severity": "info",
            },
        ],
    },

    "lavender": {
        "display_name": "Lavanta",
        "keywords": ["lavender", "lavanta", "lavandula"],
        "optimal": {
            "moisture":    (30, 50),
            "temperature": (15, 27),
            "humidity":    (30, 50),
            "light":       (10000, 40000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Çürüme"],
                "metric": "moisture", "op": "gt", "threshold": 60,
                "recommendation": "Lavanta kuraklığa dayanıklıdır. Toprağın tamamen kuruyunca sulayın.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az çiçek", "Uzama", "Soluk renk"],
                "metric": "light", "op": "lt", "threshold": 6000,
                "recommendation": "Lavanta günde 6-8 saat doğrudan güneş ışığı ister. En aydınlık pencereye taşıyın.",
                "severity": "warning",
            },
            {
                "name": "Yüksek Nem",
                "symptoms": ["Gri küf hastalığı", "Çürüme"],
                "metric": "humidity", "op": "gt", "threshold": 60,
                "recommendation": "Havalandırmayı artırın. Lavanta kuru ortamı sever.",
                "severity": "warning",
            },
        ],
    },

    "begonia": {
        "display_name": "Begonya (Begonia)",
        "keywords": ["begonia", "begonya"],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (15, 24),
            "humidity":    (50, 70),
            "light":       (2000, 10000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Kök Çürüklüğü",
                "symptoms": ["Sarı yapraklar", "Yumuşak sarkık gövde", "Küf"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Begonya aşırı sulamaya çok hassastır. Toprağın üstü kuruyunca sulayın, saksı altlığında su bırakmayın.",
                "severity": "critical",
            },
            {
                "name": "Düşük Nem",
                "symptoms": ["Yaprak uçları kıvrılma", "Çiçek dökümü"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Nem artırın ama yaprakları doğrudan ıslatmayın — küf riskini artırır. Nem tepsisi kullanın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az çiçek", "Soluk yapraklar", "Uzama"],
                "metric": "light", "op": "lt", "threshold": 1000,
                "recommendation": "Parlak dolaylı ışık verin. Doğrudan güneş yaprakları yakar.",
                "severity": "info",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Çiçek dökümü", "Büyüme durması"],
                "metric": "temperature", "op": "lt", "threshold": 12,
                "recommendation": "Begonya soğuğa duyarlıdır. Minimum 15°C ortam sağlayın.",
                "severity": "warning",
            },
        ],
    },

    "kalanchoe": {
        "display_name": "Kalanchoe",
        "keywords": ["kalanchoe", "flaming katy"],
        "optimal": {
            "moisture":    (20, 40),
            "temperature": (15, 29),
            "humidity":    (30, 60),
            "light":       (5000, 20000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Şişkin yumuşak yapraklar", "Çiçek dökümü"],
                "metric": "moisture", "op": "gt", "threshold": 55,
                "recommendation": "Toprak tamamen kuruyunca sulayın. Kalanchoe sukulent sınıfındandır.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Çiçek açmama", "Uzama"],
                "metric": "light", "op": "lt", "threshold": 3000,
                "recommendation": "Parlak ışığa taşıyın. Çiçek açması için günde 12 saat karanlık periyodu gerekir.",
                "severity": "info",
            },
        ],
    },

    # ── Yeni Ev Bitkileri ──────────────────────────────────────────

    "snake_plant": {
        "display_name": "Dil Çiçeği (Sansevieria)",
        "keywords": [
            "sansevieria", "sansevieria trifasciata", "snake plant",
            "dil çiçeği", "mother-in-law", "dracaena trifasciata",
        ],
        "optimal": {
            "moisture":    (20, 40),
            "temperature": (15, 29),
            "humidity":    (30, 60),
            "light":       (500, 10000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama (Kritik)",
                "symptoms": ["Sarı/yumuşak yapraklar", "Kötü koku", "Gövde tabanında çürüme"],
                "metric": "moisture", "op": "gt", "threshold": 55,
                "recommendation": "Sansevieria çok az su ister. 3-6 haftada bir sulama yeterli. Toprağın tamamen kurumasına izin verin.",
                "severity": "critical",
            },
            {
                "name": "Soğuk Hasar",
                "symptoms": ["Yapraklarda yumuşama", "Kahverengi lekeler"],
                "metric": "temperature", "op": "lt", "threshold": 10,
                "recommendation": "Minimum 10°C üzerinde tutun. Pencere camından uzaklaştırın.",
                "severity": "warning",
            },
        ],
    },

    "peace_lily": {
        "display_name": "Barış Çiçeği (Spathiphyllum)",
        "keywords": [
            "spathiphyllum", "peace lily", "barış çiçeği", "spath",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (18, 27),
            "humidity":    (50, 80),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Sarkık yapraklar", "Kahverengileşme"],
                "metric": "moisture", "op": "lt", "threshold": 35,
                "recommendation": "Barış çiçeği nemi sever. Toprağın üstü kuruyunca sulayın ve yaprakları sislendirin.",
                "severity": "warning",
            },
            {
                "name": "Düşük Nem",
                "symptoms": ["Yaprak uçlarında kahverengileşme", "Kıvrılma"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Günlük sislendirin veya nem tepsisi kullanın. %50+ nem idealdir.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Işık",
                "symptoms": ["Yaprak yanması", "Sarı lekeler"],
                "metric": "light", "op": "gt", "threshold": 8000,
                "recommendation": "Doğrudan güneş ışığından uzaklaştırın. Dolaylı ışık tercih edilir.",
                "severity": "warning",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Yaprak kararması", "Büyüme durması"],
                "metric": "temperature", "op": "lt", "threshold": 13,
                "recommendation": "Minimum 18°C ortam sağlayın. Soğuk hava akımlarından koruyun.",
                "severity": "warning",
            },
        ],
    },

    "calathea": {
        "display_name": "Calathea / Maranta",
        "keywords": [
            "calathea", "maranta", "goeppertia", "prayer plant", "dua bitkisi",
            "calathea orbifolia", "calathea lancifolia", "calathea medallion",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (18, 27),
            "humidity":    (60, 90),
            "light":       (500, 3000),
        },
        "problems": [
            {
                "name": "Düşük Hava Nemi (En Yaygın Sorun)",
                "symptoms": ["Yaprak uçlarında kahverengileşme", "Kıvrılmış yapraklar"],
                "metric": "humidity", "op": "lt", "threshold": 50,
                "recommendation": "Calathea yüksek nem ister (%60+). Teraryum içinde, nem tepsisiyle veya nemlendirici yakınında tutun.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Işık",
                "symptoms": ["Yaprak yanması", "Renk solması"],
                "metric": "light", "op": "gt", "threshold": 5000,
                "recommendation": "Calathea doğrudan güneş ışığından zarar görür. Gölgeli, dolaylı ışıklı konuma taşıyın.",
                "severity": "warning",
            },
            {
                "name": "Klorlu Su Zararı",
                "symptoms": ["Yaprak kenarlarında kahverengi yanma"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Musluk suyu yerine 24 saat bekletilmiş veya damıtılmış su kullanın.",
                "severity": "info",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Yaprak kıvrılması", "Büyüme durması"],
                "metric": "temperature", "op": "lt", "threshold": 15,
                "recommendation": "Calathea soğuğa hassastır. Minimum 18°C ortam sağlayın.",
                "severity": "warning",
            },
        ],
    },

    "rubber_plant": {
        "display_name": "Kauçuk Bitkisi (Ficus elastica)",
        "keywords": [
            "ficus elastica", "rubber plant", "rubber tree", "kauçuk",
            "elastic fig",
        ],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (15, 27),
            "humidity":    (40, 70),
            "light":       (2000, 10000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Yaprak dökümü", "Küf"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst yarısı kuruyunca sulayın. Kışın sulamayı azaltın.",
                "severity": "warning",
            },
            {
                "name": "Düşük Işık",
                "symptoms": ["Soluk yapraklar", "Yavaş büyüme", "Yaprak dökümü"],
                "metric": "light", "op": "lt", "threshold": 1000,
                "recommendation": "Parlak dolaylı ışık alan pencere önüne taşıyın.",
                "severity": "info",
            },
            {
                "name": "Soğuk Stres",
                "symptoms": ["Yaprak dökümü", "Kahverengi lekeler"],
                "metric": "temperature", "op": "lt", "threshold": 12,
                "recommendation": "Kauçuk bitkisi 15°C altına toleranssızdır. Isıtıcı yakınına alın.",
                "severity": "warning",
            },
        ],
    },

    "ivy": {
        "display_name": "Sarmaşık (Hedera)",
        "keywords": [
            "hedera", "hedera helix", "ivy", "english ivy", "sarmaşık",
        ],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (10, 21),
            "humidity":    (50, 70),
            "light":       (1000, 5000),
        },
        "problems": [
            {
                "name": "Kuru Hava / Kırmızıörümcek",
                "symptoms": ["Yaprak altında ince ağcıklar", "Küçülen yapraklar"],
                "metric": "humidity", "op": "lt", "threshold": 40,
                "recommendation": "Nem artırın ve yaprakları düzenli ıslak bezle silin. Kırmızıörümcek için sabunlu su spreyi kullanın.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Sıcaklık",
                "symptoms": ["Yaprak dökümü", "Solar renk"],
                "metric": "temperature", "op": "gt", "threshold": 25,
                "recommendation": "Sarmaşık serin ortamı sever. Sıcak ve kuru havadan uzaklaştırın.",
                "severity": "info",
            },
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Kök çürüklüğü"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üstü kuruyunca sulayın. İyi drene olan saksı kullanın.",
                "severity": "warning",
            },
        ],
    },

    "geranium": {
        "display_name": "Sardunya (Pelargonium)",
        "keywords": [
            "pelargonium", "geranium", "sardunya", "pelargonium zonale",
            "pelargonium hortorum",
        ],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (15, 25),
            "humidity":    (30, 50),
            "light":       (10000, 40000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Kök Çürüklüğü",
                "symptoms": ["Sarı yapraklar", "Yumuşak gövde", "Küf"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprak tamamen kuruyunca sulayın. Saksı altlığında durgunsu bırakmayın.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az çiçek", "Uzama", "Soluk renk"],
                "metric": "light", "op": "lt", "threshold": 5000,
                "recommendation": "Sardunya en az 4-6 saat doğrudan güneş ister. Balkon veya pencere önüne taşıyın.",
                "severity": "warning",
            },
            {
                "name": "Yüksek Nem",
                "symptoms": ["Gri küf hastalığı (Botrytis)", "Çürüme"],
                "metric": "humidity", "op": "gt", "threshold": 65,
                "recommendation": "Havalandırmayı artırın. Sardunya kuru havayı tercih eder.",
                "severity": "warning",
            },
        ],
    },

    "anthurium": {
        "display_name": "Antoryum (Anthurium)",
        "keywords": [
            "anthurium", "antoryum", "flamingo flower", "laceleaf",
            "anthurium andraeanum",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (18, 27),
            "humidity":    (60, 80),
            "light":       (1000, 5000),
        },
        "problems": [
            {
                "name": "Düşük Nem",
                "symptoms": ["Yaprak uçlarında kahverengileşme", "Küçük çiçekler"],
                "metric": "humidity", "op": "lt", "threshold": 50,
                "recommendation": "Antoryum yüksek nem ister. Nemlendirici veya nem tepsisi kullanın.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Kök çürüklüğü"],
                "metric": "moisture", "op": "gt", "threshold": 80,
                "recommendation": "Toprağın üstü kuruyunca sulayın. İyi drene olan orkide karışımı kullanın.",
                "severity": "critical",
            },
            {
                "name": "Aşırı Işık",
                "symptoms": ["Yaprak yanması", "Soluk çiçekler"],
                "metric": "light", "op": "gt", "threshold": 8000,
                "recommendation": "Doğrudan güneş ışığından koruyun. Parlak dolaylı ışık idealdir.",
                "severity": "warning",
            },
        ],
    },

    "dieffenbachia": {
        "display_name": "Dieffenbachia (Dumb Cane)",
        "keywords": [
            "dieffenbachia", "dumb cane", "leopard lily",
        ],
        "optimal": {
            "moisture":    (40, 60),
            "temperature": (18, 30),
            "humidity":    (50, 70),
            "light":       (500, 5000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Gövde tabanında çürüme"],
                "metric": "moisture", "op": "gt", "threshold": 70,
                "recommendation": "Toprağın üst 3 cm'si kuruyunca sulayın.",
                "severity": "warning",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Yapraklarda sarı lekeler", "Büyüme durması"],
                "metric": "temperature", "op": "lt", "threshold": 15,
                "recommendation": "Sıcaklığı 18°C üzerinde tutun. Soğuk cam ve hava akımından uzaklaştırın.",
                "severity": "warning",
            },
        ],
    },

    "cactus": {
        "display_name": "Kaktüs",
        "keywords": [
            "cactus", "cactaceae", "kaktüs", "cereus", "opuntia",
            "mammillaria", "echinopsis", "echinocactus",
        ],
        "optimal": {
            "moisture":    (10, 25),
            "temperature": (18, 35),
            "humidity":    (10, 40),
            "light":       (15000, 50000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama (En Yaygın Ölüm Sebebi)",
                "symptoms": ["Yumuşak şişkin gövde", "Kahverengi çürük dip", "Renk solması"],
                "metric": "moisture", "op": "gt", "threshold": 35,
                "recommendation": "Kaktüs çok az su ister. Yazın 2-3 haftada bir, kışın ayda bir sulayın. Toprak tamamen kurumalı.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Etiolation (uzama)", "Soluk renk", "Deformite"],
                "metric": "light", "op": "lt", "threshold": 5000,
                "recommendation": "Kaktüs maksimum güneş ister. Güneye bakan pencere veya dışarısı idealdir.",
                "severity": "warning",
            },
            {
                "name": "Yüksek Nem",
                "symptoms": ["Küf", "Çürüme"],
                "metric": "humidity", "op": "gt", "threshold": 60,
                "recommendation": "Kaktüs kuru havayı sever. Havalandırmayı artırın.",
                "severity": "warning",
            },
        ],
    },

    # ── Tarımsal Bitkiler (PlantVillage / PlantNet) ────────────────

    "tomato": {
        "display_name": "Domates (Solanum lycopersicum)",
        "keywords": [
            "tomato", "domates", "solanum lycopersicum",
            "lycopersicon esculentum",
        ],
        "optimal": {
            "moisture":    (60, 80),
            "temperature": (18, 29),
            "humidity":    (40, 70),
            "light":       (15000, 50000),
        },
        "problems": [
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Sarkık yapraklar", "Çatlak meyveler", "Çiçek dökümü"],
                "metric": "moisture", "op": "lt", "threshold": 45,
                "recommendation": "Domatesler düzenli ve derin sulama ister. Toprağın üst 5 cm'si kuruyunca sulayın.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Sarı yapraklar", "Kök çürüklüğü", "Küf"],
                "metric": "moisture", "op": "gt", "threshold": 85,
                "recommendation": "Sulamayı azaltın. Fazla su kök çürüklüğüne ve mantari hastalıklara zemin hazırlar.",
                "severity": "warning",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Meyve oluşmaması", "Mor renk değişimi", "Yavaş büyüme"],
                "metric": "temperature", "op": "lt", "threshold": 13,
                "recommendation": "Domates 13°C altında iyi büyümez. Serada veya içeride yetiştirin.",
                "severity": "warning",
            },
            {
                "name": "Aşırı Sıcaklık",
                "symptoms": ["Çiçek dökümü", "Meyve tutmama"],
                "metric": "temperature", "op": "gt", "threshold": 32,
                "recommendation": "35°C üzerinde çiçek tozu ölür. Gölgeleme ve sulama artırın.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Uzama", "Az çiçek", "Küçük meyveler"],
                "metric": "light", "op": "lt", "threshold": 8000,
                "recommendation": "Domates günde en az 8 saat doğrudan güneş ışığı ister.",
                "severity": "warning",
            },
        ],
    },

    "apple": {
        "display_name": "Elma (Malus domestica)",
        "keywords": [
            "apple", "elma", "malus", "malus domestica",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (15, 24),
            "humidity":    (40, 70),
            "light":       (20000, 60000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Kök çürüklüğü", "Sarı yapraklar"],
                "metric": "moisture", "op": "gt", "threshold": 80,
                "recommendation": "Sulamayı azaltın. Elma ağaçları derin ama seyrek sulama ister.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az meyve", "Küçük ve soluk meyveler"],
                "metric": "light", "op": "lt", "threshold": 10000,
                "recommendation": "Elma ağaçları tam güneşe ihtiyaç duyar. En az 6-8 saat doğrudan ışık gerekir.",
                "severity": "warning",
            },
        ],
    },

    "grape": {
        "display_name": "Üzüm (Vitis vinifera)",
        "keywords": [
            "grape", "üzüm", "vitis", "vitis vinifera", "grapevine",
        ],
        "optimal": {
            "moisture":    (40, 65),
            "temperature": (15, 30),
            "humidity":    (40, 65),
            "light":       (20000, 60000),
        },
        "problems": [
            {
                "name": "Yüksek Nem / Külleme Riski",
                "symptoms": ["Yapraklarda beyaz toz görünümü", "Külleme"],
                "metric": "humidity", "op": "gt", "threshold": 70,
                "recommendation": "Havalandırmayı artırın. Külleme için kükürt bazlı fungisit uygulayın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Küçük taneler", "Yaprak yanması"],
                "metric": "moisture", "op": "lt", "threshold": 30,
                "recommendation": "Vejetasyon döneminde düzenli sulayın, özellikle tane irileşme döneminde.",
                "severity": "warning",
            },
        ],
    },

    "corn": {
        "display_name": "Mısır (Zea mays)",
        "keywords": [
            "corn", "maize", "mısır", "zea mays", "zea",
        ],
        "optimal": {
            "moisture":    (60, 80),
            "temperature": (18, 32),
            "humidity":    (40, 70),
            "light":       (25000, 60000),
        },
        "problems": [
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Yaprak kıvrılması", "Boş koçan", "Erken olgunlaşma"],
                "metric": "moisture", "op": "lt", "threshold": 45,
                "recommendation": "Mısır bol su ister, özellikle tepe çiçeklenmesi döneminde. Toprak nemi %60'ın altına düşmemeli.",
                "severity": "warning",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Mor renk değişimi", "Yavaş büyüme"],
                "metric": "temperature", "op": "lt", "threshold": 10,
                "recommendation": "Mısır soğuğa hassastır. Don riski varsa serin geçen bölgelerde sezon sonu öne alın.",
                "severity": "critical",
            },
        ],
    },

    "pepper": {
        "display_name": "Biber (Capsicum annuum)",
        "keywords": [
            "pepper", "biber", "capsicum", "capsicum annuum",
            "bell pepper", "chili",
        ],
        "optimal": {
            "moisture":    (55, 75),
            "temperature": (20, 30),
            "humidity":    (40, 70),
            "light":       (15000, 50000),
        },
        "problems": [
            {
                "name": "Çiçek Dökümü",
                "symptoms": ["Çiçeklerin dökülmesi", "Meyve tutmama"],
                "metric": "temperature", "op": "gt", "threshold": 35,
                "recommendation": "35°C üzerinde çiçek tozu ölür. Gölge uygulayın ve sulamayı artırın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Sulama",
                "symptoms": ["Sarkık yapraklar", "Acımsı tat", "Küçük meyveler"],
                "metric": "moisture", "op": "lt", "threshold": 40,
                "recommendation": "Biber düzenli sulama ister. Toprak hiç kurumadan önce sulayın.",
                "severity": "warning",
            },
        ],
    },

    "strawberry": {
        "display_name": "Çilek (Fragaria)",
        "keywords": [
            "strawberry", "çilek", "fragaria", "fragaria ananassa",
        ],
        "optimal": {
            "moisture":    (60, 75),
            "temperature": (15, 26),
            "humidity":    (50, 75),
            "light":       (15000, 40000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Gri Küf",
                "symptoms": ["Meyvede gri küf (Botrytis)", "Çürüme"],
                "metric": "moisture", "op": "gt", "threshold": 85,
                "recommendation": "Sulamayı azaltın. Yaprakları ıslatmadan sadece toprağı sulayın. Havalandırmayı artırın.",
                "severity": "warning",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az meyve", "Soluk meyveler"],
                "metric": "light", "op": "lt", "threshold": 8000,
                "recommendation": "Çilek en az 6-8 saat güneş ister. Gölgede tatlı ve bol meyve vermez.",
                "severity": "warning",
            },
        ],
    },

    "peach": {
        "display_name": "Şeftali (Prunus persica)",
        "keywords": [
            "peach", "şeftali", "prunus persica", "nectarine",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (15, 28),
            "humidity":    (40, 65),
            "light":       (20000, 60000),
        },
        "problems": [
            {
                "name": "Yüksek Nem / Yaprak Kıvırcıklığı",
                "symptoms": ["Yaprak kıvırcıklığı", "Mor lekeler"],
                "metric": "humidity", "op": "gt", "threshold": 75,
                "recommendation": "Yüksek nem şeftali yaprak kıvırcıklığı hastalığını tetikler. Bakır içerikli fungisit uygulayın.",
                "severity": "warning",
            },
        ],
    },

    "cherry": {
        "display_name": "Kiraz / Vişne (Prunus)",
        "keywords": [
            "cherry", "kiraz", "vişne", "prunus avium", "prunus cerasus",
            "prunus",
        ],
        "optimal": {
            "moisture":    (50, 65),
            "temperature": (13, 25),
            "humidity":    (40, 65),
            "light":       (20000, 60000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama",
                "symptoms": ["Meyve çatlaması", "Kök çürüklüğü"],
                "metric": "moisture", "op": "gt", "threshold": 80,
                "recommendation": "Hasat öncesi düzensiz sulama meyve çatlamasına neden olur. Nem sabit tutun.",
                "severity": "warning",
            },
        ],
    },

    "blueberry": {
        "display_name": "Yaban Mersini (Vaccinium)",
        "keywords": [
            "blueberry", "yaban mersini", "vaccinium", "bilberry",
        ],
        "optimal": {
            "moisture":    (60, 75),
            "temperature": (13, 25),
            "humidity":    (50, 70),
            "light":       (15000, 40000),
        },
        "problems": [
            {
                "name": "Yüksek Toprak pH",
                "symptoms": ["Sarı yapraklar (klorozis)", "Yavaş büyüme"],
                "metric": "moisture", "op": "lt", "threshold": 45,
                "recommendation": "Yaban mersini asit toprak (pH 4.5-5.5) ister. Turba veya kükürt ekleyin.",
                "severity": "warning",
            },
        ],
    },

    "soybean": {
        "display_name": "Soya Fasulyesi (Glycine max)",
        "keywords": [
            "soybean", "soya", "glycine max", "soy",
        ],
        "optimal": {
            "moisture":    (60, 80),
            "temperature": (20, 30),
            "humidity":    (50, 75),
            "light":       (20000, 60000),
        },
        "problems": [
            {
                "name": "Su Stresi",
                "symptoms": ["Yaprak kıvrılması", "Erken sarı renk"],
                "metric": "moisture", "op": "lt", "threshold": 45,
                "recommendation": "Çiçeklenme ve bakla dolum dönemlerinde su stresi verimde ciddi kayba yol açar. Sulayın.",
                "severity": "warning",
            },
        ],
    },

    "orange": {
        "display_name": "Portakal / Narenciye (Citrus)",
        "keywords": [
            "orange", "portakal", "citrus", "citrus sinensis",
            "citrus limon", "lemon", "limon", "tangerine", "mandarin",
        ],
        "optimal": {
            "moisture":    (50, 70),
            "temperature": (18, 30),
            "humidity":    (40, 65),
            "light":       (15000, 50000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Kök Çürüklüğü",
                "symptoms": ["Sarı yapraklar", "Yaprak dökümü", "Kötü koku"],
                "metric": "moisture", "op": "gt", "threshold": 80,
                "recommendation": "Narenciye iyi drene olan toprak ister. Toprağın üst 5 cm'si kuruyunca sulayın.",
                "severity": "critical",
            },
            {
                "name": "Düşük Sıcaklık",
                "symptoms": ["Don hasarı", "Meyve dökümü"],
                "metric": "temperature", "op": "lt", "threshold": 10,
                "recommendation": "Narenciye dona hassastır. 10°C altında içeri alın veya koruyucu örtü kullanın.",
                "severity": "critical",
            },
            {
                "name": "Yetersiz Işık",
                "symptoms": ["Az çiçek", "Ekşi meyveler", "Soluk renk"],
                "metric": "light", "op": "lt", "threshold": 8000,
                "recommendation": "Narenciye bol güneş ister. Günde 8+ saat doğrudan ışık gerekir.",
                "severity": "warning",
            },
        ],
    },

    "potato": {
        "display_name": "Patates (Solanum tuberosum)",
        "keywords": [
            "potato", "patates", "solanum tuberosum",
        ],
        "optimal": {
            "moisture":    (60, 80),
            "temperature": (15, 22),
            "humidity":    (50, 80),
            "light":       (10000, 40000),
        },
        "problems": [
            {
                "name": "Aşırı Sulama / Çürüme",
                "symptoms": ["Gövde tabanı çürümesi", "Yumru çürüğü", "Kötü koku"],
                "metric": "moisture", "op": "gt", "threshold": 85,
                "recommendation": "Aşırı su yumru çürüklüğüne (black leg) yol açar. Sulamayı azaltın ve drenajı iyileştirin.",
                "severity": "critical",
            },
            {
                "name": "Aşırı Sıcaklık",
                "symptoms": ["Yumru oluşmaması", "İç kararma"],
                "metric": "temperature", "op": "gt", "threshold": 28,
                "recommendation": "Patates serin iklimi sever. 30°C üzerinde yumru oluşumu durur.",
                "severity": "warning",
            },
        ],
    },
}


# ------------------------------------------------------------------
# Yardımcı Fonksiyonlar
# ------------------------------------------------------------------

def find_plant(model_label: str) -> Optional[tuple[str, dict]]:
    """
    Model çıktısı olan label'ı bilgi tabanındaki bitkiyle eşleştirir.
    Bulunan (plant_key, plant_data) tuple'ını döner, bulunamazsa None.
    """
    label_lower = model_label.lower()
    for key, data in PLANTS.items():
        for keyword in data["keywords"]:
            if keyword in label_lower:
                return key, data
    return None


def get_sensor_value(sensor_data: dict, metric: str) -> Optional[float]:
    mapping = {
        "moisture":    "moisture_pct",
        "temperature": "temperature_c",
        "humidity":    "humidity_pct",
        "light":       "light_lux",
    }
    field = mapping.get(metric)
    if not field:
        return None
    val = sensor_data.get(field)
    return float(val) if val is not None else None


def evaluate_problems(plant_data: dict, sensor_data: Optional[dict]) -> list[dict]:
    """
    Bitkinin sorun listesini sensör verileriyle karşılaştırır.
    Tetiklenen sorunları severity sırasına göre döner.
    """
    if not sensor_data:
        return []

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    triggered = []

    for problem in plant_data["problems"]:
        value = get_sensor_value(sensor_data, problem["metric"])
        if value is None:
            continue

        op = problem["op"]
        threshold = problem["threshold"]
        triggered_flag = (
            (op == "gt" and value > threshold) or
            (op == "lt" and value < threshold)
        )

        if triggered_flag:
            triggered.append({
                "name":           problem["name"],
                "symptoms":       problem["symptoms"],
                "recommendation": problem["recommendation"],
                "severity":       problem["severity"],
                "sensor_value":   round(value, 1),
                "threshold":      threshold,
                "metric":         problem["metric"],
            })

    triggered.sort(key=lambda x: severity_order.get(x["severity"], 99))
    return triggered


def get_optimal_status(plant_data: dict, sensor_data: Optional[dict]) -> dict:
    """
    Her sensör metriği için optimal aralık ve mevcut değeri karşılaştırır.
    """
    if not sensor_data:
        return {}

    metric_labels = {
        "moisture":    ("Toprak Nemi", "%"),
        "temperature": ("Sıcaklık", "°C"),
        "humidity":    ("Hava Nemi", "%"),
        "light":       ("Işık", "lux"),
    }
    sensor_fields = {
        "moisture":    "moisture_pct",
        "temperature": "temperature_c",
        "humidity":    "humidity_pct",
        "light":       "light_lux",
    }

    status = {}
    for metric, (label, unit) in metric_labels.items():
        field = sensor_fields[metric]
        value = sensor_data.get(field)
        if value is None:
            continue

        opt_min, opt_max = plant_data["optimal"][metric]
        value = round(float(value), 1)

        if value < opt_min:
            state = "low"
        elif value > opt_max:
            state = "high"
        else:
            state = "ok"

        status[metric] = {
            "label":   label,
            "unit":    unit,
            "value":   value,
            "min":     opt_min,
            "max":     opt_max,
            "state":   state,
        }

    return status
