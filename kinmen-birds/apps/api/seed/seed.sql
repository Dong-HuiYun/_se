-- ===== birds =====
INSERT INTO birds (slug, name_zh, name_en, scientific_name, family_zh, description, habits, residency, present_months, iucn_status, tw_protection_level, image_key, audio_key, model_key, model_scale) VALUES
('great-cormorant', '鸕鶿', 'Great Cormorant', 'Phalacrocorax carbo', '鸕鶿科',
 '體型大的黑色水鳥，金門冬季數量龐大，慈湖周邊的樹林與湖面常見成群棲息，是金門最具代表性的冬季鳥類之一。',
 '善潛水捕魚，上岸後常張開雙翼晾乾羽毛；集體夜棲於樹林或礁岩。',
 'winter', '[10,11,12,1,2,3]', 'LC', NULL,
 'images/great-cormorant.jpg', 'audio/great-cormorant.mp3', 'models/great-cormorant.glb', 1.0),

('blue-tailed-bee-eater', '栗喉蜂虎', 'Blue-tailed Bee-eater', 'Merops philippinus', '蜂虎科',
 '色彩鮮豔的夏候鳥，喉部呈栗紅色，尾羽藍綠。每年春夏飛抵金門，在土坡或沙岸挖洞築巢繁殖。',
 '在空中捕食蜂類與蜻蜓等飛行昆蟲，常停棲於電線或枯枝；群居繁殖。',
 'summer', '[4,5,6,7,8]', 'LC', NULL,
 'images/blue-tailed-bee-eater.jpg', 'audio/blue-tailed-bee-eater.mp3', 'models/blue-tailed-bee-eater.glb', 1.0),

('eurasian-hoopoe', '戴勝', 'Eurasian Hoopoe', 'Upupa epops', '戴勝科',
 '頭頂有可展開的扇形冠羽，翅膀黑白相間。在金門主要為冬季出現，常見於草地與農田邊緣。',
 '以長而下彎的嘴在地面探食昆蟲與蛹；受驚時冠羽豎起。',
 'winter', '[10,11,12,1,2,3]', 'LC', NULL,
 'images/eurasian-hoopoe.jpg', 'audio/eurasian-hoopoe.mp3', 'models/eurasian-hoopoe.glb', 1.0),

('black-faced-spoonbill', '黑面琵鷺', 'Black-faced Spoonbill', 'Platalea minor', '䴉科',
 '全球瀕危的大型涉禽，嘴形如湯匙，臉部為黑色。為東亞澳洲遷徙線上的冬候鳥，金門湖泊濕地是其南遷途中的利用地之一。',
 '以扁平嘴左右揮掃淺水捕食魚蝦；喜好潮間帶與淺水濕地。',
 'winter', '[10,11,12,1,2,3]', 'EN', 'I',
 'images/black-faced-spoonbill.jpg', 'audio/black-faced-spoonbill.mp3', 'models/black-faced-spoonbill.glb', 1.2),

('common-pheasant', '環頸雉', 'Common Pheasant', 'Phasianus colchicus', '雉科',
 '雄鳥羽色豔麗，頸部有白色環紋，雌鳥為低調的褐色斑紋。在金門為留鳥，棲息於草叢、農田與灌木地帶。',
 '地棲性，清晨黃昏常於田間覓食穀物、種子與昆蟲；雄鳥繁殖期會鳴叫並振翅宣示領域。',
 'resident', '[1,2,3,4,5,6,7,8,9,10,11,12]', 'LC', NULL,
 'images/common-pheasant.jpg', 'audio/common-pheasant.mp3', 'models/common-pheasant.glb', 1.0);

-- ===== sightings（bird_id 依上方插入順序 1~5）=====
INSERT INTO sightings (bird_id, location_name, lat, lng, habitat_type, best_season, abundance, notes) VALUES
-- 鸕鶿
(1, '慈湖',   24.4560, 118.3170, '潟湖/濕地', '10月~3月', 'abundant', '傍晚大量鸕鶿回到樹林夜棲，為熱門觀察點'),
(1, '雙鯉湖', 24.4610, 118.4270, '湖泊',     '10月~3月', 'common',    '湖面與湖畔樹木常見休息群'),
-- 栗喉蜂虎
(2, '田埔水庫', 24.4770, 118.4250, '水庫/土坡', '4月~8月', 'common',   '土坡洞穴與周邊空曠地可見繁殖與捕食行為'),
(2, '陵水湖',   24.4380, 118.4150, '湖泊/草地', '5月~7月', 'uncommon', '繁殖季於周邊上空覓食'),
-- 戴勝
(3, '陵水湖',   24.4380, 118.4150, '湖畔草地', '11月~2月', 'uncommon', '湖畔草地與步道邊探食'),
(3, '慈湖',     24.4560, 118.3170, '堤岸/草地', '11月~2月', 'uncommon', '周邊農地與草地可見'),
-- 黑面琵鷺
(4, '慈湖',     24.4560, 118.3170, '潟湖/淺灘', '11月~2月', 'rare',     '淺水區覓食，數量少，請保持距離觀察'),
(4, '雙鯉湖',   24.4610, 118.4270, '湖泊淺水', '12月~2月', 'rare',     '偶見單隻或小群停棲'),
-- 環頸雉
(5, '田埔水庫', 24.4770, 118.4250, '草叢/農田', '全年',    'common',   '清晨與傍晚在水庫周邊草地常見'),
(5, '雙鯉湖',   24.4610, 118.4270, '草叢/灌木', '全年',    'common',   '湖畔灌叢與草地');

-- ===== user_reports（測試用，已審核）=====
INSERT INTO user_reports (bird_id, lat, lng, observed_at, count, observer_name, notes, status) VALUES
(1, 24.4562, 118.3175, unixepoch('2026-11-15 17:30:00'), 120, '測試賞鳥人', '傍晚回巢，數量驚人', 'approved'),
(4, 24.4558, 118.3168, unixepoch('2026-11-10 09:15:00'), 2, '測試賞鳥人', '淺灘覓食，2 隻', 'approved');