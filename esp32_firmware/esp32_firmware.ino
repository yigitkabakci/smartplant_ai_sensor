#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// â”€â”€ WiFi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const char* WIFI_SSID     = "WIFI_ADINIZ";
const char* WIFI_PASSWORD = "WIFI_SIFRENIZ";

// â”€â”€ Backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BilgisayarÄ±n yerel IP'si (ipconfig ile kontrol edin)
const char* SERVER_URL = "http://172.20.10.5:8000/api/sensor";

// â”€â”€ Pin tanÄ±mlarÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#define DHT_PIN        4     // DHT22 data pin
#define DHT_TYPE       DHT22
#define SOIL_PIN       34    // Kapasitif toprak nemi sensÃ¶rÃ¼ (analog)
#define LDR_PIN        22    // LDRÄ±ÅŸÄ±k sensÃ¶rÃ¼ (analog)

// â”€â”€ Kalibrasyon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Toprak nemi: sensÃ¶rÃ¼ havada ve Ä±slak toprakta Ã¶lÃ§erek ayarlayÄ±n
#define SOIL_DRY       3200  // Kuru toprak ADC deÄŸeri
#define SOIL_WET       1100  // Islak toprak ADC deÄŸeri

// â”€â”€ GÃ¶nderme aralÄ±ÄŸÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#define SEND_INTERVAL_MS  30000  // 30 saniyede bir gÃ¶nder

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.print("WiFi baÄŸlanÄ±yor: ");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("BaÄŸlandÄ±! IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi baÄŸlantÄ±sÄ± kesildi, yeniden baÄŸlanÄ±yor...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // â”€â”€ SensÃ¶r okuma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22 okuma hatasÄ±, atlanÄ±yor...");
    delay(2000);
    return;
  }

  int   soilRaw      = analogRead(SOIL_PIN);
  float soilMoisture = map(soilRaw, SOIL_DRY, SOIL_WET, 0, 100);
  soilMoisture       = constrain(soilMoisture, 0, 100);

  int   ldrRaw  = analogRead(LDR_PIN);
  float lightLux = (ldrRaw / 4095.0) * 100000.0;  // kaba dÃ¶nÃ¼ÅŸÃ¼m

  // â”€â”€ Serial Ã§Ä±ktÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Serial.printf("SÄ±caklÄ±k: %.1fÂ°C  Hava Nemi: %.1f%%  Toprak: %.1f%%  IÅŸÄ±k: %.0f lux\n",
                temperature, humidity, soilMoisture, lightLux);

  // â”€â”€ MAC adresi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  String mac = WiFi.macAddress();

  // â”€â”€ HTTP POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  String payload = "{";
  payload += "\"device_mac\":\"" + mac + "\",";
  payload += "\"temperature_c\":"  + String(temperature, 1) + ",";
  payload += "\"humidity_pct\":"   + String(humidity, 1)    + ",";
  payload += "\"moisture_pct\":"   + String(soilMoisture, 1)+ ",";
  payload += "\"light_lux\":"      + String(lightLux, 0);
  payload += "}";

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  if (httpCode == 201) {
    Serial.println("âœ“ Veri gÃ¶nderildi");
  } else {
    Serial.printf("âœ— HTTP hata: %d\n", httpCode);
  }

  http.end();
  delay(SEND_INTERVAL_MS);
}





