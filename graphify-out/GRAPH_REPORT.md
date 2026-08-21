# Graph Report - auction-flipper  (2026-08-21)

## Corpus Check
- 67 files · ~692,483 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1545 nodes · 3500 edges · 90 communities (75 shown, 15 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 286 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4aab3df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]

## God Nodes (most connected - your core abstractions)
1. `_()` - 793 edges
2. `ts` - 83 edges
3. `D()` - 49 edges
4. `gb` - 48 edges
5. `nw()` - 43 edges
6. `t()` - 39 edges
7. `join()` - 35 edges
8. `cb` - 33 edges
9. `handleOperation()` - 31 edges
10. `es` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Any` --uses--> `ForeclosureScraper`  [INFERRED]
  scraper/run_all_scrapers.py → scraper/county_scraper.py
- `run_county_scraper()` --calls--> `ForeclosureScraper`  [INFERRED]
  scraper/run_all_scrapers.py → scraper/county_scraper.py
- `run_freddie_scraper()` --calls--> `scrape_homesteps()`  [INFERRED]
  scraper/run_all_scrapers.py → scraper/freddie_scraper.py
- `Any` --uses--> `GSAScraper`  [INFERRED]
  scraper/run_all_scrapers.py → scraper/gsa_scraper.py
- `run_gsa_scraper()` --calls--> `GSAScraper`  [INFERRED]
  scraper/run_all_scrapers.py → scraper/gsa_scraper.py

## Import Cycles
- None detected.

## Communities (90 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (54): _(), ax, Bf, Bw, Cc(), Cn, Cr, cx (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (26): av(), bk(), ck(), cv(), ga(), jk(), _listenForAuthEvents(), Lp() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): GSAScraper, main(), print_summary(), Any, Response, Scraper for GSA Auctions using the official public API., Respect GSA rate limit: 5 calls per 5 seconds., Fetch raw auction listings from the GSA API.         The API returns all listing (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (27): binaryDecode(), cloneRequestState(), containedBy(), decode(), decodeBroadcast(), decodePush(), decodeReply(), explain() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (25): CountyScraper, ForeclosureScraper, HUDScraper, main(), make_property_record(), print_summary(), Any, Response (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (36): fetch_state_properties(), main(), map_property(), normalize_property_type(), parse_date(), Parse MM/DD/YYYY format to YYYY-MM-DD., Safely convert to float., Safely convert to int. (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (33): ajax(), batchSend(), cp(), createNamespace(), createNamespaceIfNotExists(), createTable(), createTableIfNotExists(), Di() (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (10): listBucketOptionsToQueryString(), makeRef(), ok(), Rm(), sk(), sn(), uv(), vb() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (34): $1(), B1(), be(), bv(), c1(), ch(), constructor(), d1() (+26 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (36): as(), Ca(), dr(), Ee(), Ef(), Fn(), fr(), fu() (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (35): af(), binaryEncode(), copy(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls() (+27 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (24): Exception, _extract_json_ld(), fetch_listing_detail(), _format_location_parts(), FreddieScraperError, _is_real_estate_listing(), main(), _minimal_listing_from_url() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): ScrapedProperty, AuctionComScraper, BaseScraper, HUDScraper, main(), merge_and_save(), push_to_supabase(), Any (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (27): Cs(), dm(), Dn(), Dt(), fw(), ig(), ja(), jl() (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (27): dependencies, leaflet, lucide-react, react, react-dom, react-leaflet, react-router-dom, @supabase/supabase-js (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (6): disconnect(), es, l1(), qf(), xdomainRequest(), xhrRequest()

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (24): ak(), Am(), ar(), Bn(), co(), Dc(), dg(), du() (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (9): Props, Props, Props, Props, Props, Props, Property, STATE_TAX_SALE_DATA (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (8): appendParams(), endpointURL(), processResponse(), protocol(), Qr(), serialize(), ub, x1()

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (22): ag(), bg(), cf(), cg(), cw(), eu(), gf(), Ic() (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (21): ay(), ba(), C0(), Cm(), kb(), Mr(), N0(), $p() (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (5): canPush(), leave(), leaveOpenTopic(), nb, rejoin()

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (19): Ac(), $c(), eg(), Ei(), fo(), ge(), Go(), Ld() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (19): ao(), au(), ff(), Gr(), hc(), Iu(), kn(), Oc() (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (14): clearHeartbeats(), flushSendBuffer(), hasLogger(), heartbeatTimeout(), onConnClose(), onConnError(), onConnOpen(), parseJSON() (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (20): E(), Ea(), et(), Ey(), Fc(), Jp(), kl(), Km() (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (19): _extract_value_after_label(), fetch_html(), geocode_property(), main(), normalize_property_type(), parse_address(), parse_auction_date(), parse_money() (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (5): connect(), connectWithFallback(), ly(), transportConnect(), transportName()

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (15): AuthModal(), Props, useToast(), fallbackProperties, normalizeProperty(), optionalNumber(), PropertyRecord, useSupabaseAlerts() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (18): b0(), contains(), fm(), Gd(), gm(), hs(), Il(), Kd() (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (16): cu(), D(), hm(), jd(), jy(), lg(), Lm(), mi() (+8 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (9): ap(), Gp(), Ko(), Le, np, sp, Sr(), toJSON() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (14): Bh(), cancelTimeout(), gx(), hasReceived(), on(), onClose(), onError(), onMessage() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (10): Bo(), dl(), Gh(), kf(), onJoin(), onLeave(), onSync(), Qx() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (17): Bx(), dx, e1(), ec(), fx(), i1(), Ia(), Ii() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (13): BuyerInfo, BuyWizard(), STEPS, formatCurrency(), getSaleTypeColor(), PropertyCard(), dealProfit(), dealRoi() (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (15): ab(), catch(), cy(), Da(), ep(), execute(), exists(), fetchRequest() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.21
Nodes (15): Bc(), Bm(), fg(), hg(), hu(), Jo(), Ku(), na() (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (14): he(), hi(), Hl(), j(), O(), qh(), r(), Re() (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (13): cancelRefEvent(), close(), closeAndRetry(), destroy(), ontimeout(), remove(), replaceTransport(), resend() (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (11): a1(), gv(), j1(), lh(), n1(), Oi(), r1(), Ss (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (10): Client, Toast, ToastContext, ToastContextType, ToastProvider(), get_supabase_client(), load_to_supabase(), parse_nyc_csv() (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (9): AlertPreferences(), AlertRule, Props, US_STATES, DealCalculator(), formatCurrency(), Props, useLocalStorage() (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (11): 1. Move workflow files to `.github/workflows/`, 2. Enable GitHub Pages, 3. Trigger First Deploy, 🔨 Auction Flipper, 📝 Custom Domain (Optional, Free), 🛠️ Development Workflow, 🌐 Live Sites (Free Domains), 📱 PWA Install (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (11): by(), delete(), dw(), Fp(), ky(), Md(), Po(), pw() (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (10): fetch_properties(), get_property_detail(), _map_property(), _parse_timestamp(), Any, Fannie Mae HomePath Scraper  Scrapes REO property listings from Fannie Mae's Hom, Fetch Fannie Mae HomePath REO property listings.      Args:         limit: Resul, Fetch detail for a single property by UUID.     NOTE: The public detail endpoint (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (10): Ad(), Ci(), E0(), Gy(), is(), Ls(), qy(), Sa() (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (10): al(), Kv(), ll(), nl(), qv(), sl(), wv, Xa() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.31
Nodes (7): Props, AUCTION_TYPES, CITIES, PROPERTY_TYPES, SALE_TYPES, STATES, DealFilter

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (7): applyTransformOptsToQuery(), download(), _getFinalPath(), getPublicUrl(), info(), _removeEmptyFolders(), uploadToSignedUrl()

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (3): channel(), getChannels(), rb()

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (4): inPendingSyncState(), isMember(), joinRef(), trigger()

### Community 59 - "Community 59"
Cohesion: 0.38
Nodes (7): Je(), kr(), _u(), uo(), Xd(), Yt, Ze()

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): Auction Flipper - Property Scraper, Installation, Notes, Output, Sources, Usage

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): dependencies, framework, runtime, runtimeVersion, resolved, version

### Community 62 - "Community 62"
Cohesion: 0.40
Nodes (6): ex, px, tx, vo(), ys(), Zf()

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (6): hf(), Nd(), Ro(), vs(), Vt(), Ws()

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (5): df(), Gn(), us(), Yh(), zh()

### Community 67 - "Community 67"
Cohesion: 1.00
Nodes (3): clone(), syncDiff(), syncState()

## Knowledge Gaps
- **145 isolated node(s):** `dy`, `Bw`, `Mo`, `qw`, `Jw` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_()` connect `Community 0` to `Community 1`, `Community 3`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 47`, `Community 49`, `Community 50`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 74`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._
- **Why does `gb` connect `Community 10` to `Community 0`, `Community 3`, `Community 35`, `Community 58`, `Community 16`, `Community 18`, `Community 57`, `Community 26`, `Community 29`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `ts` connect `Community 1` to `Community 0`, `Community 8`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `D()` (e.g. with `Xi` and `ol()`) actually correct?**
  _`D()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `nw()` (e.g. with `Cs()` and `Ei()`) actually correct?**
  _`nw()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dy`, `Bw`, `Mo` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.012860310421286032 - nodes in this community are weakly interconnected._