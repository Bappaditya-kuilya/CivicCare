import Database from 'better-sqlite3';
import { IssueCategory, IssueStatus } from '../types';
import { classify, urgencyHits, similar } from './triage';
import { getRealPhotoForCategory } from './syntheticAssets';

export interface SeedIssueSpec {
  title: string;
  description: string;
  location: string;
  category?: IssueCategory;
  status: IssueStatus;
  daysAgo: number;
  lat: number;
  lng: number;
  photo_url?: string | null;
  progressNote?: string;
  resolvedNote?: string;
}

// 28 Haldia-area civic reports per PRD 10.3:
// - 6 Road, 6 Water, 6 Electricity, 6 Sanitation, 4 Other
// - 16 Open, 7 In Progress, 5 Resolved
// - 3 duplicate clusters of 3-4 near-duplicates (burst pipe in Durgachak, dead streetlights in Hatiberia, garbage pile in Basudevpur)
// - 4 urgent issues with danger terms (live wire, open manhole, burst main, tree on wire)
export const SEED_ISSUES: SeedIssueSpec[] = [
  // --- URGENT DANGER ITEMS & DUPLICATE CLUSTER 1: Burst Water Pipeline in Durgachak Sector B (4 items) ---
  {
    title: 'Urgent burst water pipeline flooding Durgachak Sector B main crossing',
    description: 'High pressure drinking water main pipe has burst open near Durgachak Sector B market. Thousands of litres flooding the lane and cutting off tap supply.',
    location: 'Durgachak Sector B Main Market, Haldia',
    category: 'Water',
    status: 'Open',
    daysAgo: 2,
    lat: 22.0604,
    lng: 88.1095,
  },
  {
    title: 'Drinking water pipeline leak and burst pipe at Durgachak Sector B',
    description: 'Underground water supply pipeline burst near Durgachak Sector B market gate. Clean drinking water is gushing out non-stop and tap pressure is zero.',
    location: 'Durgachak Sector B Market Gate, Haldia',
    category: 'Water',
    status: 'Open',
    daysAgo: 1,
    lat: 22.0609,
    lng: 88.1101,
  },
  {
    title: 'Burst water main pipe wasting drinking supply in Durgachak Sector B',
    description: 'Major leak in municipal water pipeline at Durgachak Sector B. Drinking water gushing onto the street and households have no tap water.',
    location: 'Durgachak Sector B Block 4, Haldia',
    category: 'Water',
    status: 'Open',
    daysAgo: 1,
    lat: 22.0598,
    lng: 88.1089,
  },

  // --- URGENT DANGER ITEM 2: Live Wire Sparking near School Gate ---
  {
    title: 'Emergency live wire sparking dangerously near Bhabanipur school gate',
    description: 'High voltage overhead electric wire snapped and is hanging low with continuous sparks right outside the primary school gate in Bhabanipur. Immediate danger of electrocution.',
    location: 'Bhabanipur Primary School Gate, Ward 11, Haldia',
    category: 'Electricity',
    status: 'Open',
    daysAgo: 1,
    lat: 22.0492,
    lng: 88.0815,
  },

  // --- URGENT DANGER ITEM 3: Open Manhole near Hospital ---
  {
    title: 'Uncovered open manhole hazard outside Haldia Sub-Divisional Hospital',
    description: 'Deep sewage manhole cover is missing right on the ambulance and pedestrian approach outside the hospital gate. Urgent accident risk at night.',
    location: 'Haldia Township Hospital Approach, Ward 19',
    category: 'Sanitation',
    status: 'Open',
    daysAgo: 3,
    lat: 22.0285,
    lng: 88.0612,
  },

  // --- URGENT DANGER ITEM 4: Fallen Tree on High-Voltage Wire ---
  {
    title: 'Danger: fallen tree on live wire sparking in Sutahata bazaar',
    description: 'Heavy storm branch collapsed onto the 11kV overhead electric cable causing sparks and fire risk near Sutahata bazaar transformer.',
    location: 'Sutahata Bazaar Transformer Corner, Haldia',
    category: 'Electricity',
    status: 'In Progress',
    daysAgo: 4,
    lat: 22.1325,
    lng: 88.1410,
    progressNote: 'WBSEDCL line crew dispatched; feeder isolated and tree removal underway.',
  },

  // --- DUPLICATE CLUSTER 2: Dead Streetlights in Hatiberia (3 items) ---
  {
    title: 'Dead streetlights and dark poles along Hatiberia main market stretch',
    description: 'Row of 10 electric streetlight poles in Hatiberia market has not been working for a week, leaving commuters and shopkeepers in complete darkness.',
    location: 'Hatiberia Main Market Stretch, Ward 15, Haldia',
    category: 'Electricity',
    status: 'Open',
    daysAgo: 6,
    lat: 22.0412,
    lng: 88.0745,
  },
  {
    title: 'Non-working streetlight poles causing blackout in Hatiberia market',
    description: 'All electric streetlights along the Hatiberia market stretch are dead at night. Commuters face safety issues due to dark poles.',
    location: 'Hatiberia Market Crossing, Ward 15, Haldia',
    category: 'Electricity',
    status: 'Open',
    daysAgo: 5,
    lat: 22.0418,
    lng: 88.0751,
  },
  {
    title: 'Broken electric streetlights not working at Hatiberia market',
    description: 'Eight consecutive streetlight poles in Hatiberia market are dead. Complete darkness after 6 PM for shopkeepers and pedestrians.',
    location: 'Hatiberia Market South End, Ward 15, Haldia',
    category: 'Electricity',
    status: 'Open',
    daysAgo: 4,
    lat: 22.0407,
    lng: 88.0739,
  },

  // --- DUPLICATE CLUSTER 3: Overflowing Garbage Pile in Basudevpur (3 items) ---
  {
    title: 'Overflowing garbage vat and rotting waste pile in Basudevpur Ward 8',
    description: 'Municipal concrete dustbin vat in Basudevpur is overflowing with uncollected garbage and rotting waste, causing severe stink and mosquito breeding.',
    location: 'Basudevpur Ward 8 Community Vat, Haldia',
    category: 'Sanitation',
    status: 'Open',
    daysAgo: 7,
    lat: 22.0680,
    lng: 88.0950,
  },
  {
    title: 'Uncollected garbage pile and overflowing dustbin vat in Basudevpur',
    description: 'Huge pile of rotting municipal garbage spilling out of the Basudevpur Ward 8 vat. Terrible stink and stray dogs scattering trash.',
    location: 'Basudevpur Ward 8 Near Ration Shop, Haldia',
    category: 'Sanitation',
    status: 'Open',
    daysAgo: 5,
    lat: 22.0685,
    lng: 88.0956,
  },
  {
    title: 'Rotting waste and overflowing garbage dustbin in Basudevpur Ward 8',
    description: 'Sanitation truck has not cleared the overflowing garbage vat in Basudevpur Ward 8 for days. Unbearable stink and mosquito hazard.',
    location: 'Basudevpur Ward 8 Primary Lane, Haldia',
    category: 'Sanitation',
    status: 'Open',
    daysAgo: 3,
    lat: 22.0675,
    lng: 88.0944,
  },

  // --- REMAINING ROAD ISSUES (6 total Road) ---
  {
    title: 'Deep pothole cluster near Ranichak refinery gate causing accidents',
    description: 'Multiple 1-foot deep potholes on the main asphalt highway approach at Ranichak gate. Two bikers skidded and suffered injuries yesterday.',
    location: 'Ranichak Refinery Gate Approach, Haldia',
    category: 'Road',
    status: 'Open',
    daysAgo: 8,
    lat: 22.0370,
    lng: 88.0910,
  },
  {
    title: 'Collapsed culvert slab on Manjushree link road',
    description: 'Concrete culvert edge has cracked and caved in near Manjushree crossing, narrowing the lane and risking vehicle collapse.',
    location: 'Manjushree Link Road, Ward 10, Haldia',
    category: 'Road',
    status: 'In Progress',
    daysAgo: 11,
    lat: 22.0540,
    lng: 88.0880,
    progressNote: 'PWD engineering team barricaded the culvert and started reinforcement shuttering.',
  },
  {
    title: 'Damaged footpath tiles and sunken pavement in CPT Colony',
    description: 'Broken concrete footpath slabs along CPT Colony avenue force senior citizens and school children to walk on the busy carriageway.',
    location: 'CPT Colony Main Avenue, Haldia Township',
    category: 'Road',
    status: 'Open',
    daysAgo: 9,
    lat: 22.0220,
    lng: 88.0550,
  },
  {
    title: 'Unpainted high speed breaker damaging vehicles at Chiranjibpur',
    description: 'Newly constructed asphalt speed breaker near Chiranjibpur rail overbridge has no white thermoplastic warning stripes.',
    location: 'Chiranjibpur ROB Approach, Haldia',
    category: 'Road',
    status: 'In Progress',
    daysAgo: 12,
    lat: 22.0460,
    lng: 88.1020,
    progressNote: 'Reflective cat-eyes ordered; painting crew scheduled for night shift.',
  },
  {
    title: 'Cracked asphalt road surface repaired near Haldia Dock Complex Gate 2',
    description: 'Heavy container movement caused deep ruts and asphalt cracks outside Dock Complex Gate 2.',
    location: 'Haldia Dock Complex Gate 2, Chiranjibpur',
    category: 'Road',
    status: 'Resolved',
    daysAgo: 16,
    lat: 22.0310,
    lng: 88.0710,
    progressNote: 'Hot-mix macadam patching machine deployed to site.',
    resolvedNote: 'Resurfaced 45-meter stretch with mastic asphalt and compacted; open to traffic.',
  },
  {
    title: 'Broken road divider blocks repaired at Durgachak Khudiram More',
    description: 'Concrete median divider blocks were displaced after a truck collision, obstructing the turning bay.',
    location: 'Khudiram More, Durgachak, Haldia',
    category: 'Road',
    status: 'Resolved',
    daysAgo: 19,
    lat: 22.0620,
    lng: 88.1130,
    progressNote: 'Crane unit dispatched to realign pre-cast concrete median blocks.',
    resolvedNote: 'Median blocks reset and painted with yellow-black hazard stripes.',
  },

  // --- REMAINING WATER ISSUES (3 more to make 6 total Water) ---
  {
    title: 'Muddy contaminated water coming from public tap in Debhog',
    description: 'Municipal standpost tap in Debhog Ward 6 is discharging yellowish muddy water with foul odour since pipeline repair.',
    location: 'Debhog Ward 6 Standpost, Haldia',
    category: 'Water',
    status: 'In Progress',
    daysAgo: 5,
    lat: 22.0570,
    lng: 88.0690,
    progressNote: 'Water quality sample collected by PHE lab; flushing of branch pipeline initiated.',
  },
  {
    title: 'Defective handpump and dry tubewell in Balughata riverside para',
    description: 'Community Mark-II tubewell cylinder is broken in Balughata, forcing 40 families to walk 1 km for drinking water.',
    location: 'Balughata Riverside Para, Haldia',
    category: 'Water',
    status: 'Open',
    daysAgo: 10,
    lat: 22.0710,
    lng: 88.1280,
  },
  {
    title: 'Leaking sluice valve on overhead reservoir line in Haldia Township',
    description: 'Main cast-iron sluice valve below Sector 14 overhead water reservoir was leaking continuously.',
    location: 'Sector 14 Overhead Reservoir, Haldia Township',
    category: 'Water',
    status: 'Resolved',
    daysAgo: 15,
    lat: 22.0250,
    lng: 88.0590,
    progressNote: 'Water supply shut off for 2 hours to replace gland packing and rubber gasket.',
    resolvedNote: 'Valve gasket replaced and pressure-tested at 4 bar with zero leakage.',
  },

  // --- REMAINING ELECTRICITY ISSUES (1 more to make 6 total Electricity) ---
  {
    title: 'Frequent low voltage and phase failure in Brajanathchak residential block',
    description: 'Severe voltage drop below 150V every evening in Brajanathchak causing water pumps and fans to stop working.',
    location: 'Brajanathchak Ward 4, Haldia',
    category: 'Electricity',
    status: 'Resolved',
    daysAgo: 18,
    lat: 22.0640,
    lng: 88.0820,
    progressNote: 'Load balancing inspection started on 63kVA distribution transformer.',
    resolvedNote: 'Replaced corroded neutral jumper and balanced three-phase feeder load.',
  },

  // --- REMAINING SANITATION ISSUES (2 more to make 6 total Sanitation) ---
  {
    title: 'Choked concrete stormwater drain overflowing in Talpukur',
    description: 'Silt and plastic bags have completely blocked the main roadside drain in Talpukur, causing dirty sewage water to spill onto thresholds.',
    location: 'Talpukur Main Lane, Ward 13, Haldia',
    category: 'Sanitation',
    status: 'In Progress',
    daysAgo: 7,
    lat: 22.0445,
    lng: 88.0865,
    progressNote: 'Sanitation desilting gang deployed; 32 meters of drain cleared so far.',
  },
  {
    title: 'Public market toilet septic overflow cleared at Mohana Fish Market',
    description: 'Blocked outlet pipe at Mohana market public toilet block caused unhygienic sewage seepage.',
    location: 'Mohana Fish Market, Haldia Township',
    category: 'Sanitation',
    status: 'Resolved',
    daysAgo: 14,
    lat: 22.0195,
    lng: 88.0510,
    progressNote: 'Suction jetting machine brought in by municipal conservancy wing.',
    resolvedNote: 'Septic line cleared, disinfected with bleaching powder, and water flushing restored.',
  },

  // --- OTHER ISSUES (4 total Other) ---
  {
    title: 'Broken children swing and rusted seesaw in Kshudiram Nagar Park',
    description: 'Play equipment in the ward children park has sharp rusted edges that could hurt kids playing in the evening.',
    location: 'Kshudiram Nagar Ward Park, Haldia',
    category: 'Other',
    status: 'Open',
    daysAgo: 13,
    lat: 22.0335,
    lng: 88.0655,
  },
  {
    title: 'Uprooted casuarina tree blocking pedestrian bench along Marine Drive',
    description: 'Old casuarina tree tilted during coastal wind and is resting across the walkway bench along Haldia Marine Drive.',
    location: 'Marine Drive Promenade, Haldia Township',
    category: 'Other',
    status: 'In Progress',
    daysAgo: 6,
    lat: 22.0160,
    lng: 88.0480,
    progressNote: 'Parks & Gardens forestry team sawing branches to clear the promenade.',
  },
  {
    title: 'Faded ward boundary and house numbering board at Kadamtala',
    description: 'Directional board at the entrance of Kadamtala housing lane is completely rusted and illegible for delivery and emergency vehicles.',
    location: 'Kadamtala Housing Entrance, Haldia',
    category: 'Other',
    status: 'Open',
    daysAgo: 17,
    lat: 22.0515,
    lng: 88.0975,
  },
  {
    title: 'Stray cattle herd obstructing morning bus bay at Durgachak Bus Stand',
    description: 'Large group of stray cattle sits inside the passenger bus bay every morning causing traffic bottlenecks.',
    location: 'Durgachak Terminus Bus Stand, Haldia',
    category: 'Other',
    status: 'In Progress',
    daysAgo: 9,
    lat: 22.0615,
    lng: 88.1115,
    progressNote: 'Municipal enforcement squad coordinating with local dairy owners and Pound shelter.',
  },
];

export function seedDatabaseIfNeeded(db: Database.Database, force = false): { seeded: boolean; count: number } {
  if (force) {
    db.exec('DELETE FROM status_events; DELETE FROM issues; DELETE FROM sqlite_sequence;');
  } else {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM issues').get() as { cnt: number };
    if (row.cnt > 0) {
      return { seeded: false, count: row.cnt };
    }
  }

  const now = Date.now();
  const insertIssue = db.prepare(`
    INSERT INTO issues (
      title, description, location, photo_url, lat, lng,
      category, status, urgency_hits, similar_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT INTO status_events (
      issue_id, from_status, to_status, note, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const insertedRows: Array<{
      id: number;
      category: IssueCategory;
      status: IssueStatus;
      title: string;
      description: string;
      location: string;
    }> = [];

    for (const item of SEED_ISSUES) {
      const cat = item.category || classify(item.title, item.description).category;
      const urg = urgencyHits(item.title, item.description).count;
      const createdDate = new Date(now - item.daysAgo * 24 * 60 * 60 * 1000);
      const createdAtIso = createdDate.toISOString();

      let updatedAtIso = createdAtIso;
      if (item.status === 'In Progress') {
        updatedAtIso = new Date(createdDate.getTime() + 12 * 60 * 60 * 1000).toISOString();
      } else if (item.status === 'Resolved') {
        updatedAtIso = new Date(createdDate.getTime() + 36 * 60 * 60 * 1000).toISOString();
      }

      const info = insertIssue.run(
        item.title,
        item.description,
        item.location,
        getRealPhotoForCategory(cat, item.photo_url),
        item.lat,
        item.lng,
        cat,
        item.status,
        urg,
        0,
        createdAtIso,
        updatedAtIso
      );

      const issueId = Number(info.lastInsertRowid);

      // Initial Open event
      insertEvent.run(issueId, null, 'Open', 'Reported via public resident portal', createdAtIso);

      if (item.status === 'In Progress' || item.status === 'Resolved') {
        const progTime = new Date(createdDate.getTime() + 12 * 60 * 60 * 1000).toISOString();
        insertEvent.run(
          issueId,
          'Open',
          'In Progress',
          item.progressNote || 'Assigned to ward maintenance engineer for field inspection.',
          progTime
        );
      }

      if (item.status === 'Resolved') {
        const resTime = new Date(createdDate.getTime() + 36 * 60 * 60 * 1000).toISOString();
        insertEvent.run(
          issueId,
          'In Progress',
          'Resolved',
          item.resolvedNote || 'Repair completed and verified by ward supervisor.',
          resTime
        );
      }

      insertedRows.push({
        id: issueId,
        category: cat,
        status: item.status,
        title: item.title,
        description: item.description,
        location: item.location,
      });
    }

    // Compute pairwise similarity across unresolved issues per PRD 2.7
    const updateSim = db.prepare('UPDATE issues SET similar_count = ? WHERE id = ?');
    for (let i = 0; i < insertedRows.length; i++) {
      const a = insertedRows[i];
      if (a.status === 'Resolved') continue;
      let simCount = 0;
      for (let j = 0; j < insertedRows.length; j++) {
        if (i === j) continue;
        const b = insertedRows[j];
        if (b.status === 'Resolved') continue;
        if (similar(a, b)) {
          simCount += 1;
        }
      }
      if (simCount > 0) {
        updateSim.run(simCount, a.id);
      }
    }
  });

  tx();
  return { seeded: true, count: SEED_ISSUES.length };
}
