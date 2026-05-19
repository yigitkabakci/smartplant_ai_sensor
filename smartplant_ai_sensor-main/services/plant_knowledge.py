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
        "keywords": ["monstera", "swiss cheese"],
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
        "keywords": ["pothos", "devil", "epipremnum", "efemera"],
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
        "keywords": ["ficus", "fig", "benjamina", "weeping fig"],
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
        "keywords": ["dracaena", "dragon tree", "corn plant"],
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
        "keywords": ["orchid", "phalaenopsis", "orkide"],
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
        "keywords": ["aloe", "aloe vera"],
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
        "keywords": ["spider", "chlorophytum", "airplane"],
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
        "keywords": ["philodendron", "filodendron", "heartleaf"],
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
        "keywords": ["zamioculcas", "zz plant", "zz bitkisi", "zanzibar"],
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
        "keywords": ["schefflera", "umbrella", "dwarf umbrella"],
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
