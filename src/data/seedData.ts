import { Roll, Session, RollField } from '../types';

export const SEED_PEOPLE: [string, string, string, string][] = [
  ["Akwaboah Benedict Kwabena Junior", "Editorial", "0555233330", "Pair 1"],
  ["Badu Nhyira Afua Kwartemaa", "FISA", "0545184419", "Pair 1"],
  ["Roland Okyere", "Bible Study", "0594895936", "Pair 2"],
  ["Grace Sarpong Oppong-Poku", "Editorial", "0535321024", "Pair 2"],
  ["Wilberforce Amoah Baffour Buadee", "Media Department", "0544102563", "Pair 3"],
  ["Nhyira Effah Somuah", "Organizing Department", "0535445778", "Pair 3"],
  ["Theophilus Amankwah", "Media Department", "0509100314", "Pair 4"],
  ["Boateng Esther Agyeiwaa", "Independence Hall", "0559682281", "Pair 4"],
  ["Maxwell Danso Agyapong", "Off Campus C", "0257448800", "Pair 5"],
  ["Esther Asamoah", "Queens Hall", "0592079976 / 0206045914", "Pair 5"],
  ["Tawiah Nathaniel", "PESPG", "0535701813", "Pair 6"],
  ["Neizer Benedicta Aba Otuwah", "Off Campus A", "0245962267", "Pair 6"],
  ["Osei Simeon", "Organizing Department", "0274250427", "Pair 7"],
  ["Palmer Pearl Aba Obeng", "PESPG", "0559336811", "Pair 7"],
  ["Sarkodie Raymond", "PESPG", "0539396560", "Pair 8"],
  ["Martha Amu", "Prayer Force", "0537022732", "Pair 8"],
  ["John Jeja", "Brunei East", "0553730457", "Pair 9"],
  ["Helina Asantewaa Norbi", "Ladies’ Wing", "0201416558", "Pair 9"],
  ["Rhema Lartey", "Organizing Department", "0507706733", "Pair 10"],
  ["Owoo Justina Yaa", "Bible Study", "0538976364", "Pair 10"],
  ["Anim Aikins Kelvin", "Brunei West", "0535837350", "Pair 11"],
  ["Mavis Sarfowaah", "Unity Hall", "0555560903", "Pair 11"],
  ["Amprofi Benedict", "Prayer Force", "0598103072", "Pair 12"],
  ["Freda Ghartey", "Brunei West", "0554766411", "Pair 12"],
  ["Samuel Opoku Okai", "Brunei East", "0595364659", "Pair 13"],
  ["Paulina Viola Ashun", "Off Campus D", "0555155324", "Pair 13"],
  ["Michael Forson", "Transport Department", "0256835310", "Pair 14"],
  ["Blessing Antwi Boasiako", "Off Campus C", "0504144178", "Pair 14"],
  ["Asamoah Stephen Baidoo", "Republic Hall", "0544783017", "Pair 15"],
  ["Beatrice Aggrey", "Off Campus B", "0536177610", "Pair 15"],
  ["Ayivor Eugene", "Bible Study", "0554745519", "Pair 16"],
  ["Akua Amankwah Obeng", "Brunei East", "0598446551", "Pair 16"],
  ["Damptey Godfred Konadu", "Evangelism Department", "0509664238 / 0591571190", "Pair 17"],
  ["Torvor Leticia Venunye", "Business Chamber", "0591067209", "Pair 17"],
  ["Noah Andoh", "Off Campus B", "0537537902", "Pair 18"],
  ["Michaela Jane Andoh Sey", "Evangelism Department", "0538269800", "Pair 18"],
  ["Adoreba Samuel", "Independence Hall", "0598479980", "Pair 19"],
  ["Bernice Obo Smith", "Off Campus A", "0595558468", "Pair 19"],
  ["Daniel Akanvari", "Unity Hall", "0535709500", "Pair 20"],
  ["Emmanuella Mensah", "Republic Hall", "0599508802", "Pair 20"],
  ["Edmond Kwaku Asuming", "Gents’ Wing", "0534397296", "Pair 21"],
  ["Naaki Abigail Tetteh", "Music and Drama", "0508699087", "Pair 21"],
  ["Boamah Bright", "Alumni Coordinator", "0241094347", "Pair 22"],
  ["Nyankey Rhoda Ayisaah", "Organizing Department", "0545953352", "Pair 22"],
  ["Oscar Ansah Afari", "Gents’ Wing", "0599906606", "Pair 23"],
  ["Josephine Ansah", "Organizing Department", "0537925114", "Pair 23"],
  ["Daniel Fiifi Mensah", "Organizing Department", "0553396239", "Pair 24"],
  ["Yaa Dansoaa Aidoo", "University Hall", "0536810795", "Pair 24"],
  ["Jesse Kennedy Nana Oduro", "Off Campus B", "0545060689", "Pair 25"],
  ["Amoah Godslove", "Treasurer", "0537319597", "Pair 25"],
  ["Bismark Dickah", "Brunei West", "0531664698", "Pair 26"],
  ["Deborah Obeng", "Off Campus B", "0596357280", "Pair 26"],
  ["Dcn. Acheampong Kwabena", "Gents’ Wing", "0531926437", "Pair 27"],
  ["Blay Addo Erica", "Off Campus C", "0209330755", "Pair 27"],
  ["Takpa Solomon Kwashie", "Off Campus D", "0553531475 / 0509668655", "Pair 28"],
  ["Boakye Hannah Dufie", "FISA", "0530696625", "Pair 28"],
  ["Mckeown Amamoo Kissi", "Evangelism Department", "0204064221", "Pair 29"],
  ["Abban Kyeraa Stella", "Off Campus C", "0207781185", "Pair 29"],
  ["Gyamfi John", "Off Campus A", "0534656391", "Pair 30"],
  ["Sarpong Helena", "Ladies’ Wing", "0536008845", "Pair 30"],
  ["Prince Darko Affum", "University Hall", "0596218808", "Pair 31"],
  ["Dcns. Abigail Assan", "H.I.S", "0256560465", "Pair 31"],
  ["Asamoah Emmanuel Amo", "Off Campus C", "0552807480", "Pair 32"],
  ["Georgina Kyeponyere", "Ushering Department", "0531571249", "Pair 32"],
  ["Saah Samuel Kojo Okyere", "Transport Department", "0550427702", "Pair 33"],
  ["Josephine Amoako Asantewaa", "Off Campus A", "0530163228 / 0509686661", "Pair 33"],
  ["Mettle Emmrich Nii Teiko", "Media Department", "0539991379", "Pair 34"],
  ["Sarah Brago", "Off Campus A", "0242109112 / 0597130110", "Pair 34"],
  ["Boarbil Moses Lebna", "Media Department", "0533325202", "Pair 35"],
  ["Winnifred Acheampomaa Osei Bonsu", "PESPG", "0503328052", "Pair 35"],
  ["Michael Quaicoe", "Off Campus B", "0555899329", "Pair 36"],
  ["Perces Attaah Pokuaah Hammond", "PESPG", "0591298907 / 0509307295", "Pair 36"],
  ["Kelvin Tettey Natoko", "H.I.S", "0533279076", "Pair 37"],
  ["Mary Ansah", "Africa Hall", "0535266538", "Pair 37"],
  ["Brenya Reuben", "Off Campus D", "0539462534", "Pair 38"],
  ["Ofori Prisca Forson", "Ladies’ Wing", "0533593637", "Pair 38"],
  ["Hadzor Barnabas Kekeli", "Music and Drama", "0257476141", "Pair 39"],
  ["Precious Nutifafa", "Ladies’ Wing", "0596837525", "Pair 39"],
  ["Ezekiel Nti Buobu", "Queens Hall", "0531922211", "Pair 40"],
  ["Smith Sabina", "Organizing Department", "0532405280", "Pair 40"],
  ["Andrews Amoako-Ayim", "Africa Hall", "0597120034", "Pair 41"],
  ["Veronica Konadu Appiah", "Organizing Department", "0536409158", "Pair 41"],
  ["Barnabas Mensah", "H.I.S", "0256351863", "Pair 42"],
  ["Abigail Amuzu", "Off Campus C", "0554797050", "Pair 42"],
  ["Marfo Samuel Baah", "Ushering Department", "0509305873 / 0257023043", "Pair 43"],
  ["Lovia Osei Agyeiwah", "Off Campus D", "0595249977", "Pair 43"],
  ["Kelvin Bataabonga Vwalogo", "Off Campus D", "0243491197", "Pair 44"],
  ["Padmore Aboah", "Gents’ Wing", "0503321499", "Pair 44"],
  ["Godfred Acheampong", "Prayer Force", "0599460558", "Pair 45"],
  ["Ebenezer Tamakloe", "Off Campus A", "0531664901", "Pair 45"],
  ["Dcn. Vincent Mensah Agyapong Owusu", "PDP Coordinator", "0597373129 / 0591966791 / 0509683368", "Pair 46"],
  ["Acheampong Alex Nkansah", "Evangelism Department", "0537117133 / 0506808236", "Pair 46"],
  ["Samuel Koramoah Bampo", "Building and Maintenance", "0533004715", "Pair 47"],
  ["Darkwa Samuel", "Media Department", "0509686088", "Pair 47"],
  ["Issaka Salia Pius", "Off Campus A", "0257324224", "Pair 48"],
  ["Benedict Appiah", "Off Campus C", "0558177886", "Pair 48"],
  ["Amponsah Elijah Weston", "Bible Study", "0530926915", "Pair 49"],
  ["Joel Ekow Ansah", "Political Chamber", "0531726414", "Pair 49"]
];

/**
 * Exactly 73 attendees checked in as shown in the completed register PDF:
 * Started: 31 Oct 2026, 11:49:00
 * Finished: 31 Oct 2026, 15:52:12
 * Present: 73, Absent: 25, Total: 98
 */
export const COMPLETED_CHECKIN_LOG = `Akwaboah Benedict Kwabena Junior|12:08:12
Badu Nhyira Afua Kwartemaa|12:08:24
Roland Okyere|11:53:06
Grace Sarpong Oppong-Poku|11:53:14
Nhyira Effah Somuah|12:05:56
Theophilus Amankwah|13:22:38
Boateng Esther Agyeiwaa|12:18:22
Maxwell Danso Agyapong|15:51:59
Osei Simeon|12:02:18
Palmer Pearl Aba Obeng|12:02:19
Sarkodie Raymond|14:59:54
Martha Amu|11:50:32
John Jeja|12:06:13
Helina Asantewaa Norbi|11:51:34
Rhema Lartey|14:14:47
Mavis Sarfowaah|12:17:41
Amprofi Benedict|11:54:26
Freda Ghartey|11:54:09
Paulina Viola Ashun|12:03:06
Beatrice Aggrey|13:21:54
Ayivor Eugene|11:53:27
Damptey Godfred Konadu|12:02:47
Torvor Leticia Venunye|15:01:09
Noah Andoh|12:01:28
Michaela Jane Andoh Sey|12:01:32
Adoreba Samuel|12:11:22
Bernice Obo Smith|12:11:41
Daniel Akanvari|12:17:28
Edmond Kwaku Asuming|12:12:36
Naaki Abigail Tetteh|11:49:34
Nyankey Rhoda Ayisaah|12:03:32
Oscar Ansah Afari|12:12:23
Daniel Fiifi Mensah|11:51:12
Yaa Dansoaa Aidoo|11:49:07
Amoah Godslove|11:54:44
Bismark Dickah|12:19:23
Deborah Obeng|12:04:45
Dcn. Acheampong Kwabena|11:59:37
Blay Addo Erica|11:49:45
Mckeown Amamoo Kissi|12:17:01
Abban Kyeraa Stella|11:50:23
Gyamfi John|12:05:14
Sarpong Helena|11:51:53
Dcns. Abigail Assan|11:52:33
Asamoah Emmanuel Amo|12:12:52
Georgina Kyeponyere|11:53:39
Josephine Amoako Asantewaa|12:00:19
Mettle Emmrich Nii Teiko|11:58:05
Sarah Brago|11:55:07
Boarbil Moses Lebna|11:56:20
Winnifred Acheampomaa Osei Bonsu|11:56:12
Michael Quaicoe|11:54:34
Perces Attaah Pokuaah Hammond|11:54:32
Kelvin Tettey Natoko|11:59:45
Brenya Reuben|12:04:00
Ofori Prisca Forson|11:52:50
Precious Nutifafa|12:17:53
Smith Sabina|11:50:51
Andrews Amoako-Ayim|12:08:43
Veronica Konadu Appiah|12:19:35
Barnabas Mensah|12:11:09
Abigail Amuzu|12:10:49
Lovia Osei Agyeiwah|13:24:42
Kelvin Bataabonga Vwalogo|12:13:50
Padmore Aboah|12:09:03
Godfred Acheampong|12:01:09
Dcn. Vincent Mensah Agyapong Owusu|11:51:25
Acheampong Alex Nkansah|11:51:24
Samuel Koramoah Bampo|11:59:07
Darkwa Samuel|11:57:23
Issaka Salia Pius|11:50:01
Benedict Appiah|12:16:40
Amponsah Elijah Weston|12:06:42`;

export function getInitialSeedData(): { rolls: Roll[]; sessions: Session[] } {
  const defaultFields: RollField[] = [
    {
      id: 'unit',
      name: 'Affiliated Group / Unit',
      type: 'text',
      required: true,
    },
    {
      id: 'phone',
      name: 'Phone',
      type: 'phone',
      required: false,
      isPhoneField: true,
      isWhatsappActive: true,
    },
    {
      id: 'tag',
      name: 'Pair #',
      type: 'label',
      required: false,
      isGroupField: true,
      labelConfig: {
        labelType: 'number',
        prefix: 'Pair ',
        startValue: 1,
        step: 1,
        itemsPerLabel: 2,
      },
    },
  ];

  const members = SEED_PEOPLE.map((p, index) => ({
    id: `m-sns-${index + 1}`,
    name: p[0],
    unit: p[1],
    phone: p[2],
    tag: p[3],
    data: {
      unit: p[1],
      phone: p[2],
      tag: p[3],
    },
  }));

  const initialRoll: Roll = {
    id: 'sns',
    name: 'SNS People',
    description: 'Active committee members, ministry departments & hall pairs',
    createdAt: '2026-10-01T00:00:00.000Z',
    fields: defaultFields,
    groupFieldId: 'tag',
    members,
  };

  const day = '2026-10-31T';
  const marks: Record<string, string> = {};

  COMPLETED_CHECKIN_LOG.split('\n').forEach((line) => {
    const [name, time] = line.split('|');
    if (!name || !time) return;
    const member = members.find((m) => m.name.trim() === name.trim());
    if (member) {
      marks[member.id] = `${day}${time.trim()}Z`;
    }
  });

  const initialSession: Session = {
    id: 'sess-sns-20261031',
    rollId: 'sns',
    rollName: 'SNS People',
    title: 'SNS Register – 31 Oct 2026',
    start: '2026-10-31T11:49:00.000Z',
    end: '2026-10-31T15:52:12.000Z',
    status: 'closed',
    fields: defaultFields,
    members: members.map((m) => ({ ...m, data: { ...m.data } })),
    marks,
    location: 'Main Auditorium',
    notes: 'Completed register: 73 present, 25 absent out of 98 members (74.5% turnout).',
  };

  return {
    rolls: [initialRoll],
    sessions: [initialSession],
  };
}
