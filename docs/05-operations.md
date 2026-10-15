# Stickers, maps, payments and support

## Sticker production workflow

1. Register and secure a distinctive domain before printing live stock. The repository name can remain carQR; commercial naming must avoid confusion with CarQR Pakistan.
2. Generate random public token and independent sealed activation secret. Store hashes; produce a private print manifest with minimum necessary information. Printing supplier must not receive phone numbers.
3. Public artwork includes readable official domain, contact purpose, QR, opaque support code and brief language cue. The secret belongs under a scratch panel or sealed packaging, never exposed on windshield.
4. Encode HTTPS URL only, not phone/plate/vCard. Use a tested QR library, four-module quiet zone, high contrast and error correction suited to damage. Avoid decorative logos covering modules.
5. Prototype an approximately 70×50 mm label with a QR around 30–35 mm square; these are design starting dimensions, not a guaranteed scanning specification. Test the actual URL/module density and material before ordering.
6. Request quotes for reverse-printed inside-glass UV-protected vinyl/static cling and outside-use laminated alternative. Reverse printing must leave the code correctly readable from outside. Get samples and written material specifications; do not claim five-year life without evidence.
7. Test sunlight, glare, tinted glass, dust, low light, older cameras, viewing angles and practical distance. Record sample ID and phone. Test adhesion/heat exposure safely; do not obstruct driver vision, sensors or required markings.
8. Print a 20-piece engineering sample first, then pilot quantity after acceptance. Track batch, fulfillment, activation and replacement. Destroy spoiled claim secrets and limit supplier file retention.

Owner activation must be self-service with the secret and verified contact. A public scan of an unclaimed tag shows generic activation/help, never permits takeover without the secret. A replacement normally gets a new token and revokes the old one. Transfer requires explicit release/recovery review and invalidates previous sessions.

## Maps

A QR sticker has no GPS radio. Optional browser geolocation describes the scanner’s reported device location at that time. It does not establish the car’s actual position and can be spoofed or denied. Store accuracy and timestamp when accepted. A textual “Gate B / basement level 1” may be more useful than GPS indoors.

MVP: reason plus optional location text, and an owner-only map link when coordinates are voluntarily supplied. No map is required to submit an alert. Later: MapLibre/Leaflet with a licensed tile service and visible attribution. OpenStreetMap data availability does not grant unlimited use of the public tile servers [S17]. Document map vendor costs and data processing. No mandatory 100 m geofence in A, no public car tracking and no implicit continuous location permissions.

## Order and payment workflow

Pilot can use an invoice/manual bank or supported local payment collection with explicit reconciliation. A screenshot is not payment proof: verify settlement/reference with authorized merchant access before marking paid. Never collect card credentials. Record order, allocation, price, refund and fulfillment independently from activation.

Later integrate JazzCash/Easypaisa or an approved gateway only after merchant eligibility, fees, settlement, refunds and webhook verification are documented. Client callbacks cannot set paid status. A verified signed provider event and reconciliation control the state. Do not advertise unsupported payment logos as live integrations.

## Site operation

Obtain site permission, designate a staff sponsor, explain privacy and train guards on the scanner flow. Distribute tags to consenting owners and run a test alert. Site administrator sees activation counts and incident summaries. Guard access is site-scoped; no directory of personal numbers. Maintain a daily unresolved/failed-delivery review during pilot.

Support handles failed activation, lost packaging, changed phone, compromised tag, unwanted contact and refunds. Recovery never relies on reading the public QR. Keep an audited manual review path and a defined response window chosen according to team availability; do not claim 24/7 support without staffing it.

## Operating runbook

Monitor API health, outbox age, queue delay, provider rejection, SMS fallback rate, unknown attempts, spend and abuse reports. On a channel outage: disable new dispatch if unsafe, retain incidents, respect expiry, use the independent approved fallback and show honest status. On credential leak: revoke/rotate, contain access, inspect audit evidence and assess notification duties. On DB failure: pause writes, restore tested backup, reconcile provider submissions before retries. On excessive tag abuse: pause that tag, notify owner through a safe channel and investigate.
