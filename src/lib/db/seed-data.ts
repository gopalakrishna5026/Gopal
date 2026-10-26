import type { ClassCode, Station, TrainType } from "@/types";

export const STATIONS: Station[] = [
  { code: "NDLS", name: "New Delhi", city: "New Delhi", state: "Delhi" },
  { code: "MMCT", name: "Mumbai Central", city: "Mumbai", state: "Maharashtra" },
  { code: "CSMT", name: "Chhatrapati Shivaji Maharaj Terminus", city: "Mumbai", state: "Maharashtra" },
  { code: "HWH", name: "Howrah Junction", city: "Kolkata", state: "West Bengal" },
  { code: "SDAH", name: "Sealdah", city: "Kolkata", state: "West Bengal" },
  { code: "MAS", name: "MGR Chennai Central", city: "Chennai", state: "Tamil Nadu" },
  { code: "SBC", name: "KSR Bengaluru City Junction", city: "Bengaluru", state: "Karnataka" },
  { code: "SC", name: "Secunderabad Junction", city: "Hyderabad", state: "Telangana" },
  { code: "PUNE", name: "Pune Junction", city: "Pune", state: "Maharashtra" },
  { code: "ADI", name: "Ahmedabad Junction", city: "Ahmedabad", state: "Gujarat" },
  { code: "JP", name: "Jaipur Junction", city: "Jaipur", state: "Rajasthan" },
  { code: "LKO", name: "Lucknow Charbagh", city: "Lucknow", state: "Uttar Pradesh" },
  { code: "CNB", name: "Kanpur Central", city: "Kanpur", state: "Uttar Pradesh" },
  { code: "PRYJ", name: "Prayagraj Junction", city: "Prayagraj", state: "Uttar Pradesh" },
  { code: "BSB", name: "Varanasi Junction", city: "Varanasi", state: "Uttar Pradesh" },
  { code: "PNBE", name: "Patna Junction", city: "Patna", state: "Bihar" },
  { code: "BPL", name: "Bhopal Junction", city: "Bhopal", state: "Madhya Pradesh" },
  { code: "NGP", name: "Nagpur Junction", city: "Nagpur", state: "Maharashtra" },
  { code: "ERS", name: "Ernakulam Junction", city: "Kochi", state: "Kerala" },
  { code: "TVC", name: "Thiruvananthapuram Central", city: "Thiruvananthapuram", state: "Kerala" },
  { code: "ASR", name: "Amritsar Junction", city: "Amritsar", state: "Punjab" },
  { code: "CDG", name: "Chandigarh", city: "Chandigarh", state: "Chandigarh" },
  { code: "AGC", name: "Agra Cantt", city: "Agra", state: "Uttar Pradesh" },
  { code: "GWL", name: "Gwalior Junction", city: "Gwalior", state: "Madhya Pradesh" },
  { code: "BRC", name: "Vadodara Junction", city: "Vadodara", state: "Gujarat" },
  { code: "KOTA", name: "Kota Junction", city: "Kota", state: "Rajasthan" },
  { code: "ST", name: "Surat", city: "Surat", state: "Gujarat" },
  { code: "GHY", name: "Guwahati", city: "Guwahati", state: "Assam" },
  { code: "DDN", name: "Dehradun", city: "Dehradun", state: "Uttarakhand" },
  { code: "JAT", name: "Jammu Tawi", city: "Jammu", state: "Jammu & Kashmir" },
  { code: "VSKP", name: "Visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh" },
  { code: "BBS", name: "Bhubaneswar", city: "Bhubaneswar", state: "Odisha" },
];

/** [stationCode, arrival, departure, dayOffset, cumulativeKm] */
type StopTuple = [string, string | null, string | null, number, number];

export interface SeedTrain {
  number: string;
  name: string;
  type: TrainType;
  runDays: number[];
  classes: [ClassCode, number, number][]; // [class, totalSeats, fullRouteFare]
  stops: StopTuple[];
}

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const RAJ: [ClassCode, number, number][] = [
  ["1A", 24, 4950],
  ["2A", 96, 3250],
  ["3A", 288, 2350],
];

export const SEED_TRAINS: SeedTrain[] = [
  {
    number: "12951",
    name: "Mumbai Central – New Delhi Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["MMCT", null, "17:00", 0, 0],
      ["ST", "19:53", "19:58", 0, 263],
      ["BRC", "21:03", "21:13", 0, 392],
      ["KOTA", "03:15", "03:25", 1, 920],
      ["NDLS", "08:32", null, 1, 1386],
    ],
  },
  {
    number: "12952",
    name: "New Delhi – Mumbai Central Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["NDLS", null, "16:55", 0, 0],
      ["KOTA", "21:35", "21:45", 0, 466],
      ["BRC", "03:50", "04:00", 1, 994],
      ["ST", "05:00", "05:05", 1, 1123],
      ["MMCT", "08:35", null, 1, 1386],
    ],
  },
  {
    number: "12909",
    name: "Mumbai – Hazrat Nizamuddin Garib Rath",
    type: "Garib Rath",
    runDays: [0, 2, 4],
    classes: [["3A", 432, 1480]],
    stops: [
      ["MMCT", null, "17:25", 0, 0],
      ["ST", "20:10", "20:15", 0, 263],
      ["KOTA", "05:20", "05:30", 1, 920],
      ["NDLS", "10:35", null, 1, 1386],
    ],
  },
  {
    number: "12137",
    name: "Punjab Mail",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["1A", 24, 4100],
      ["2A", 96, 2650],
      ["3A", 288, 1880],
      ["SL", 432, 720],
    ],
    stops: [
      ["CSMT", null, "19:35", 0, 0],
      ["BPL", "12:20", "12:30", 1, 840],
      ["GWL", "17:30", "17:35", 1, 1225],
      ["AGC", "19:05", "19:10", 1, 1343],
      ["NDLS", "23:25", null, 1, 1538],
    ],
  },
  {
    number: "12002",
    name: "New Delhi – Bhopal Shatabdi",
    type: "Shatabdi",
    runDays: DAILY,
    classes: [["CC", 390, 1460]],
    stops: [
      ["NDLS", null, "06:00", 0, 0],
      ["AGC", "07:50", "07:55", 0, 195],
      ["GWL", "09:23", "09:28", 0, 313],
      ["BPL", "14:25", null, 0, 702],
    ],
  },
  {
    number: "22436",
    name: "New Delhi – Varanasi Vande Bharat",
    type: "Vande Bharat",
    runDays: [0, 1, 2, 3, 5, 6],
    classes: [["CC", 312, 1780]],
    stops: [
      ["NDLS", null, "06:00", 0, 0],
      ["CNB", "10:08", "10:10", 0, 440],
      ["PRYJ", "12:08", "12:10", 0, 634],
      ["BSB", "14:00", null, 0, 759],
    ],
  },
  {
    number: "12301",
    name: "Howrah – New Delhi Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["HWH", null, "16:50", 0, 0],
      ["PRYJ", "03:55", "03:57", 1, 1006],
      ["CNB", "06:15", "06:20", 1, 1201],
      ["NDLS", "10:00", null, 1, 1450],
    ],
  },
  {
    number: "12259",
    name: "Sealdah – New Delhi Duronto",
    type: "Duronto",
    runDays: [2, 4, 6],
    classes: [
      ["1A", 24, 4700],
      ["2A", 96, 3050],
      ["3A", 288, 2180],
      ["SL", 432, 860],
    ],
    stops: [
      ["SDAH", null, "18:30", 0, 0],
      ["NDLS", "11:10", null, 1, 1454],
    ],
  },
  {
    number: "12627",
    name: "Karnataka Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["2A", 96, 4120],
      ["3A", 288, 2860],
      ["SL", 432, 1060],
    ],
    stops: [
      ["SBC", null, "19:20", 0, 0],
      ["BPL", "20:00", "20:10", 1, 1950],
      ["AGC", "03:35", "03:40", 2, 2350],
      ["NDLS", "07:20", null, 2, 2550],
    ],
  },
  {
    number: "12621",
    name: "Tamil Nadu Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["1A", 24, 5350],
      ["2A", 96, 3500],
      ["3A", 288, 2480],
      ["SL", 432, 940],
    ],
    stops: [
      ["MAS", null, "22:00", 0, 0],
      ["NGP", "15:05", "15:10", 1, 1100],
      ["BPL", "22:10", "22:20", 1, 1490],
      ["AGC", "05:00", "05:05", 2, 1880],
      ["NDLS", "07:10", null, 2, 2182],
    ],
  },
  {
    number: "12623",
    name: "Chennai – Thiruvananthapuram Mail",
    type: "Express",
    runDays: DAILY,
    classes: [
      ["2A", 96, 1850],
      ["3A", 288, 1300],
      ["SL", 432, 485],
    ],
    stops: [
      ["MAS", null, "19:45", 0, 0],
      ["ERS", "07:00", "07:05", 1, 695],
      ["TVC", "11:45", null, 1, 921],
    ],
  },
  {
    number: "12028",
    name: "KSR Bengaluru – Chennai Shatabdi",
    type: "Shatabdi",
    runDays: [0, 1, 3, 4, 5, 6],
    classes: [["CC", 390, 1095]],
    stops: [
      ["SBC", null, "06:00", 0, 0],
      ["MAS", "11:00", null, 0, 362],
    ],
  },
  {
    number: "12127",
    name: "Mumbai – Pune Intercity Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["CC", 234, 420],
      ["2S", 324, 125],
    ],
    stops: [
      ["CSMT", null, "06:40", 0, 0],
      ["PUNE", "09:57", null, 0, 192],
    ],
  },
  {
    number: "12009",
    name: "Mumbai Central – Ahmedabad Shatabdi",
    type: "Shatabdi",
    runDays: [1, 2, 3, 4, 5, 6],
    classes: [["CC", 390, 1250]],
    stops: [
      ["MMCT", null, "06:20", 0, 0],
      ["ST", "09:03", "09:08", 0, 263],
      ["BRC", "10:27", "10:32", 0, 392],
      ["ADI", "11:55", null, 0, 492],
    ],
  },
  {
    number: "12957",
    name: "Swarna Jayanti Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["ADI", null, "17:40", 0, 0],
      ["JP", "03:20", "03:30", 1, 626],
      ["NDLS", "08:00", null, 1, 935],
    ],
  },
  {
    number: "12015",
    name: "Ajmer Shatabdi",
    type: "Shatabdi",
    runDays: DAILY,
    classes: [["CC", 390, 1110]],
    stops: [
      ["NDLS", null, "06:10", 0, 0],
      ["JP", "10:40", null, 0, 308],
    ],
  },
  {
    number: "12013",
    name: "Amritsar Shatabdi",
    type: "Shatabdi",
    runDays: DAILY,
    classes: [["CC", 390, 1265]],
    stops: [
      ["NDLS", null, "16:30", 0, 0],
      ["CDG", "19:45", "19:50", 0, 266],
      ["ASR", "22:30", null, 0, 449],
    ],
  },
  {
    number: "12423",
    name: "Dibrugarh Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["NDLS", null, "16:10", 0, 0],
      ["CNB", "21:05", "21:10", 0, 440],
      ["PNBE", "04:45", "04:55", 1, 1000],
      ["GHY", "19:35", null, 1, 1865],
    ],
  },
  {
    number: "12391",
    name: "Shramjeevi Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["2A", 96, 1950],
      ["3A", 288, 1380],
      ["SL", 432, 520],
    ],
    stops: [
      ["PNBE", null, "07:10", 0, 0],
      ["BSB", "11:45", "11:55", 0, 228],
      ["LKO", "18:15", "18:25", 0, 520],
      ["NDLS", "04:15", null, 1, 1013],
    ],
  },
  {
    number: "12431",
    name: "Thiruvananthapuram Rajdhani",
    type: "Rajdhani",
    runDays: [2, 4, 5],
    classes: [
      ["1A", 24, 7800],
      ["2A", 96, 4850],
      ["3A", 288, 3520],
    ],
    stops: [
      ["TVC", null, "19:15", 0, 0],
      ["ERS", "22:55", "23:00", 0, 220],
      ["NDLS", "12:40", null, 2, 3149],
    ],
  },
  {
    number: "12017",
    name: "Dehradun Shatabdi",
    type: "Shatabdi",
    runDays: DAILY,
    classes: [["CC", 390, 1030]],
    stops: [
      ["NDLS", null, "06:45", 0, 0],
      ["DDN", "12:50", null, 0, 302],
    ],
  },
  {
    number: "12723",
    name: "Telangana Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["2A", 96, 2950],
      ["3A", 288, 2080],
      ["SL", 432, 790],
    ],
    stops: [
      ["SC", null, "06:00", 0, 0],
      ["NGP", "14:20", "14:25", 0, 580],
      ["BPL", "21:35", "21:45", 0, 970],
      ["NDLS", "08:00", null, 1, 1677],
    ],
  },
  {
    number: "22691",
    name: "KSR Bengaluru Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: [
      ["1A", 24, 6650],
      ["2A", 96, 4300],
      ["3A", 288, 3080],
    ],
    stops: [
      ["SBC", null, "20:00", 0, 0],
      ["SC", "07:40", "07:50", 1, 610],
      ["NGP", "17:00", "17:05", 1, 1190],
      ["BPL", "23:40", "23:50", 1, 1580],
      ["NDLS", "05:30", null, 2, 2365],
    ],
  },
  {
    number: "12841",
    name: "Coromandel Express",
    type: "Superfast",
    runDays: DAILY,
    classes: [
      ["2A", 96, 2550],
      ["3A", 288, 1790],
      ["SL", 432, 680],
      ["2S", 216, 390],
    ],
    stops: [
      ["HWH", null, "15:20", 0, 0],
      ["BBS", "21:20", "21:25", 0, 437],
      ["VSKP", "05:35", "05:55", 1, 879],
      ["MAS", "16:50", null, 1, 1662],
    ],
  },
  {
    number: "12425",
    name: "Jammu Rajdhani",
    type: "Rajdhani",
    runDays: DAILY,
    classes: RAJ,
    stops: [
      ["NDLS", null, "20:40", 0, 0],
      ["CDG", "23:45", "23:55", 0, 266],
      ["JAT", "05:45", null, 1, 577],
    ],
  },
];

export const POPULAR_ROUTES: { from: string; to: string }[] = [
  { from: "MMCT", to: "NDLS" },
  { from: "NDLS", to: "BSB" },
  { from: "SBC", to: "MAS" },
  { from: "HWH", to: "NDLS" },
  { from: "CSMT", to: "PUNE" },
  { from: "NDLS", to: "JP" },
];
