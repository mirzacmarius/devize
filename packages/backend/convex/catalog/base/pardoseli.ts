import type { BaseNorm } from "./norm";
import {
  adezivC2TE,
  adezivC2TES1,
  amorsaSape,
  bandaPerimetrala,
  betonC25,
  betoniera,
  betonist,
  chit,
  dibluCui,
  elicopterBeton,
  equipment,
  faiantar,
  fibre,
  foliePolietilena,
  folieSpuma,
  gresie,
  masinaSlefuitBeton,
  masinaSlefuitParchet,
  masinaTaiatPlaci,
  masinaTaiatRosturi,
  material,
  montatorGips,
  mortarSapa,
  necalificat,
  parchetar,
  parchetLaminat,
  placiSpc,
  plintaGresie,
  plintaParchet,
  pompaBeton,
  pompaSapa,
  profilTrecere,
  sapaAutonivelanta,
  sistemNivelare,
  smallMaterials,
  vibrator,
  vopsitor,
} from "./resources";

const category = "Pardoseli";

const sapaAnhidrit = material(
  "Șapă din anhidrit autonivelantă, livrată pompată",
  "mc",
  520,
);
const aditivSapa = material(
  "Aditiv pentru șape pe încălzire în pardoseală",
  "l",
  12,
);
const elementSapaUscata = material(
  "Element de șapă uscată din fibrogips, 25 mm",
  "mp",
  75,
);
const granule = material("Granule de egalizare pentru șape uscate", "l", 1.2);
const surubSapaUscata = material("Șurub pentru șape uscate", "buc", 0.1);
const adezivSapaUscata = material("Adeziv pentru șape uscate", "kg", 30);
const gresieMare = material("Gresie porțelanată format mare", "mp", 110);
const gresieExterior = material(
  "Gresie porțelanată antiderapantă pentru exterior, 2 cm",
  "mp",
  120,
);
const plot = material("Plot reglabil pentru terase", "buc", 12);
const piatraPardoseala = material(
  "Plăci din piatră naturală pentru pardoseli",
  "mp",
  220,
);
const impregnant = material("Impregnant pentru piatră naturală", "l", 60);
const parchetStratificat = material(
  "Parchet din lemn triplustratificat, 14 mm",
  "mp",
  180,
);
const parchetMasiv = material("Parchet masiv din stejar, 20 mm", "mp", 260);
const adezivParchet = material("Adeziv poliuretanic pentru parchet", "kg", 28);
const lacParchet = material("Lac pentru parchet, bicomponent", "l", 65);
const uleiParchet = material("Ulei-ceară pentru parchet", "l", 95);
const chitParchet = material("Chit de rosturi pentru parchet", "kg", 25);
const abraziveParchet = material("Abrazive pentru șlefuit parchet", "buc", 3);
const covorPvc = material("Covor PVC eterogen, 2 mm", "mp", 55);
const adezivCovor = material(
  "Adeziv acrilic pentru covoare PVC și mochete",
  "kg",
  14,
);
const cordonSudura = material("Cordon de sudură pentru pardoseli PVC", "m", 2);
const aerCald = equipment("Aparat de sudat cu aer cald", "ora", 12);
const lvt = material("Pardoseală vinilică LVT lipită", "mp", 85);
const mocheta = material("Mochetă de trafic intens", "mp", 60);
const linoleum = material("Linoleum natural, 2,5 mm", "mp", 90);
const fibreMetalice = material("Fibre metalice pentru beton", "kg", 6);
const cuart = material("Durificator de suprafață cu cuarț", "kg", 2.2);
const chitPoliuretanic = material(
  "Chit poliuretanic pentru rosturi, cartuș de 600 ml",
  "buc",
  35,
);
const amorsaEpoxidica = material("Amorsă epoxidică", "kg", 42);
const rasinaEpoxidica = material(
  "Pardoseală epoxidică autonivelantă, 2 mm",
  "kg",
  48,
);
const nisipCuartos = material("Nisip cuarțos pentru rășini", "kg", 1.5);
const vopseaEpoxidica = material("Vopsea epoxidică pentru pardoseli", "kg", 38);
const profilDilatatie = material(
  "Profil de dilatație pentru pardoseli",
  "m",
  45,
);
const plintaLemn = material("Plintă din lemn masiv", "m", 28);
const treaptaLemn = material(
  "Treaptă din lemn masiv pentru scări, cu contratreaptă",
  "buc",
  350,
);
const pardosealaTehnica = material(
  "Pardoseală tehnică supraînălțată, cu structura ei",
  "mp",
  280,
);
const covorCauciuc = material(
  "Covor de cauciuc pentru săli de sport",
  "mp",
  150,
);
const adezivSportiv = material(
  "Adeziv poliuretanic bicomponent pentru pardoseli sportive",
  "kg",
  32,
);

export const pardoseli: BaseNorm[] = [
  {
    code: "DV-PRD-01",
    category,
    title: "Șapă din mortar de ciment de 5 cm, armată cu fibre, driscuită",
    unit: "mp",
    includes:
      "Folia de separare, banda perimetrală, prepararea și turnarea mortarului, nivelarea pe repere și driscuirea.",
    excludes: "Termoizolația; tăierea rosturilor de contracție.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      foliePolietilena(1.1),
      bandaPerimetrala(0.6),
      mortarSapa(0.053),
      fibre(0.03),
      betonist(0.35),
      necalificat(0.25),
      betoniera(0.05),
    ],
  },
  {
    code: "DV-PRD-02",
    category,
    title: "Strat de egalizare din șapă autonivelantă de 5 mm",
    unit: "mp",
    includes:
      "Amorsarea suportului, prepararea și turnarea șapei, egalizarea cu rola cu țepi.",
    excludes: "Reparațiile suportului.",
    measurement: "Suprafața egalizată.",
    resources: [
      amorsaSape(0.15),
      sapaAutonivelanta(8),
      betonist(0.12),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-PRD-03",
    category,
    title:
      "Pardoseală din gresie porțelanată de 60 × 60 cm, lipită cu adeziv flexibil",
    unit: "mp",
    includes:
      "Trasarea, prepararea adezivului, lipirea plăcilor cu sistem de nivelare, tăieturile, rostuirea și curățarea.",
    excludes: "Șapa; plintele.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      gresie(1.06),
      adezivC2TE(5.5),
      chit(0.35),
      sistemNivelare(6),
      smallMaterials(2),
      faiantar(0.85),
      necalificat(0.25),
      masinaTaiatPlaci(0.06),
    ],
  },
  {
    code: "DV-PRD-04",
    category,
    title: "Plintă din gresie, lipită cu adeziv flexibil",
    unit: "m",
    includes: "Tăierea, lipirea și rostuirea plintei.",
    measurement: "Lungimea plintei.",
    resources: [plintaGresie(1.05), adezivC2TE(0.4), chit(0.05), faiantar(0.2)],
  },
  {
    code: "DV-PRD-05",
    category,
    title: "Pardoseală din parchet laminat de 8 mm, montată flotant",
    unit: "mp",
    includes:
      "Folia de protecție la umiditate, folia de spumă, montarea parchetului cu îmbinare click și tăieturile.",
    excludes: "Plintele și profilele de trecere.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      foliePolietilena(1.1),
      folieSpuma(1.05),
      parchetLaminat(1.05),
      parchetar(0.3),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-PRD-06",
    category,
    title: "Pardoseală vinilică SPC cu îmbinare click, montată flotant",
    unit: "mp",
    includes:
      "Folia de protecție la umiditate, montarea plăcilor cu îmbinare click și tăieturile.",
    excludes: "Plintele și profilele de trecere.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      foliePolietilena(1.1),
      placiSpc(1.05),
      parchetar(0.28),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-PRD-07",
    category,
    title: "Plintă din MDF sau PVC pentru parchet, cu accesorii",
    unit: "m",
    includes:
      "Tăierea și montarea plintei cu clipsuri sau adeziv, cu colțurile și capetele ei.",
    measurement: "Lungimea plintei.",
    resources: [plintaParchet(1.05), smallMaterials(5), parchetar(0.12)],
  },
  {
    code: "DV-PRD-08",
    category,
    title:
      "Șapă semiuscată de 5 cm, pompată, armată cu fibre, driscuită mecanic",
    unit: "mp",
    includes:
      "Folia de separare, banda perimetrală, prepararea și pomparea mortarului, nivelarea pe repere și driscuirea mecanică.",
    excludes: "Termoizolația; tăierea rosturilor de contracție.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      foliePolietilena(1.1),
      bandaPerimetrala(0.6),
      mortarSapa(0.053),
      fibre(0.03),
      betonist(0.22),
      necalificat(0.15),
      pompaSapa(0.04),
    ],
  },
  {
    code: "DV-PRD-09",
    category,
    title: "Șapă din anhidrit autonivelantă de 4 cm, pompată",
    unit: "mp",
    includes:
      "Folia de separare, banda perimetrală, amorsarea, turnarea șapei pompate și dezaerarea cu bara, protejarea de curenți de aer.",
    excludes:
      "Termoizolația; șlefuirea laptelui de anhidrit înainte de finisaj.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      foliePolietilena(1.1),
      bandaPerimetrala(0.6),
      amorsaSape(0.1),
      sapaAnhidrit(0.042),
      betonist(0.12),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-PRD-10",
    category,
    title:
      "Șapă din mortar de ciment de 7 cm peste încălzirea în pardoseală, cu aditiv și fibre",
    unit: "mp",
    includes:
      "Banda perimetrală, prepararea mortarului cu aditiv, turnarea peste țevi fără a le mișca, nivelarea și driscuirea, rosturile la uși.",
    excludes: "Termoizolația și țevile de încălzire; încălzirea de uscare.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      bandaPerimetrala(0.6),
      mortarSapa(0.072),
      fibre(0.04),
      aditivSapa(0.15),
      betonist(0.4),
      necalificat(0.3),
      betoniera(0.06),
    ],
  },
  {
    code: "DV-PRD-11",
    category,
    title:
      "Șapă uscată din elemente de fibrogips de 25 mm, pe granule de egalizare de 3 cm",
    unit: "mp",
    includes:
      "Folia de separare, împrăștierea și nivelarea granulelor, așezarea elementelor cu falțurile lipite și înșurubate, tăieturile.",
    excludes: "Termoizolația suplimentară.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      foliePolietilena(1.1),
      granule(30),
      elementSapaUscata(1.05),
      surubSapaUscata(15),
      adezivSapaUscata(0.05),
      montatorGips(0.45),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-PRD-12",
    category,
    title: "Strat de egalizare din șapă autonivelantă de 10 mm",
    unit: "mp",
    includes:
      "Amorsarea suportului, prepararea și turnarea șapei, egalizarea cu rola cu țepi.",
    excludes: "Reparațiile suportului.",
    measurement: "Suprafața egalizată.",
    resources: [
      amorsaSape(0.15),
      sapaAutonivelanta(16),
      betonist(0.15),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-PRD-13",
    category,
    title:
      "Pardoseală din gresie porțelanată de format mic, până la 30 × 30 cm, lipită cu adeziv flexibil",
    unit: "mp",
    includes:
      "Trasarea, prepararea adezivului, lipirea plăcilor, tăieturile, rostuirea și curățarea.",
    excludes: "Șapa; plintele.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      gresie(1.06),
      adezivC2TE(4.5),
      chit(0.5),
      smallMaterials(2),
      faiantar(0.75),
      necalificat(0.2),
      masinaTaiatPlaci(0.05),
    ],
  },
  {
    code: "DV-PRD-14",
    category,
    title:
      "Pardoseală din gresie porțelanată de format mare, de la 80 × 80 cm, dublu încleiată cu adeziv deformabil",
    unit: "mp",
    includes:
      "Trasarea, adezivul pe suport și pe spatele plăcii, așezarea cu ventuze și sistem de nivelare, tăieturile, rostuirea și curățarea.",
    excludes: "Șapa, care trebuie plană la 2 mm pe 2 m; plintele.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      gresieMare(1.08),
      adezivC2TES1(7),
      chit(0.3),
      sistemNivelare(5),
      smallMaterials(2),
      faiantar(1.1),
      necalificat(0.3),
      masinaTaiatPlaci(0.08),
    ],
  },
  {
    code: "DV-PRD-15",
    category,
    title:
      "Pardoseală din gresie porțelanată pe încălzire în pardoseală sau la exterior, cu adeziv deformabil S1",
    unit: "mp",
    includes:
      "Trasarea, prepararea adezivului deformabil, lipirea plăcilor cu sistem de nivelare, tăieturile, rostuirea cu chit flexibil și curățarea.",
    excludes: "Șapa; hidroizolația la exterior; plintele.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      gresie(1.06),
      adezivC2TES1(5.5),
      chit(0.35),
      sistemNivelare(6),
      smallMaterials(2),
      faiantar(0.9),
      necalificat(0.25),
      masinaTaiatPlaci(0.06),
    ],
  },
  {
    code: "DV-PRD-16",
    category,
    title:
      "Pardoseală exterioară din gresie porțelanată de 2 cm, așezată pe ploturi reglabile",
    unit: "mp",
    includes:
      "Așezarea și reglarea ploturilor, montarea plăcilor la nivel, tăieturile la margini.",
    excludes: "Hidroizolația și panta de dedesubt; profilele de margine.",
    measurement: "Suprafața pardoselii.",
    resources: [
      gresieExterior(1.05),
      plot(4),
      faiantar(0.6),
      necalificat(0.25),
    ],
  },
  {
    code: "DV-PRD-17",
    category,
    title:
      "Pardoseală din plăci de piatră naturală, lipită cu adeziv deformabil, impregnată",
    unit: "mp",
    includes:
      "Trasarea, lipirea plăcilor cu adeziv deformabil, tăieturile, rostuirea, curățarea și impregnarea pietrei.",
    excludes: "Șapa; plintele; lustruirea la fața locului.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      piatraPardoseala(1.05),
      adezivC2TES1(6),
      chit(0.3),
      impregnant(0.1),
      smallMaterials(2),
      faiantar(1.3),
      necalificat(0.35),
      masinaTaiatPlaci(0.1),
    ],
  },
  {
    code: "DV-PRD-18",
    category,
    title: "Pardoseală din parchet triplustratificat de 14 mm, montată flotant",
    unit: "mp",
    includes:
      "Folia de protecție la umiditate, folia de spumă, montarea parchetului cu îmbinare click și tăieturile.",
    excludes: "Plintele și profilele de trecere.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      foliePolietilena(1.1),
      folieSpuma(1.05),
      parchetStratificat(1.06),
      parchetar(0.35),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-PRD-19",
    category,
    title: "Pardoseală din parchet triplustratificat de 14 mm, lipită pe șapă",
    unit: "mp",
    includes:
      "Verificarea umidității șapei, întinderea adezivului cu gletiera dințată, lipirea lamelelor și tăieturile.",
    excludes: "Amorsarea și egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      parchetStratificat(1.06),
      adezivParchet(1.1),
      parchetar(0.6),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-PRD-20",
    category,
    title:
      "Pardoseală din parchet masiv de stejar de 20 mm, lipit, rașchetat și lăcuit",
    unit: "mp",
    includes:
      "Lipirea lamelelor cu adeziv poliuretanic, rașchetarea în trei treceri, chituirea rosturilor, grundul și două straturi de lac.",
    excludes: "Amorsarea și egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      parchetMasiv(1.08),
      adezivParchet(1.2),
      chitParchet(0.1),
      lacParchet(0.3),
      abraziveParchet(0.3),
      parchetar(1.3),
      necalificat(0.15),
      masinaSlefuitParchet(0.25),
    ],
  },
  {
    code: "DV-PRD-21",
    category,
    title:
      "Rașchetarea și lăcuirea parchetului existent, în două straturi de lac",
    unit: "mp",
    includes:
      "Rașchetarea în trei treceri cu granulații descrescătoare, chituirea rosturilor, desprăfuirea, grundul și două straturi de lac.",
    excludes: "Înlocuirea lamelelor deteriorate.",
    measurement: "Suprafața parchetului rașchetat.",
    resources: [
      lacParchet(0.3),
      chitParchet(0.1),
      abraziveParchet(0.3),
      parchetar(0.55),
      masinaSlefuitParchet(0.3),
    ],
  },
  {
    code: "DV-PRD-22",
    category,
    title: "Uleierea parchetului cu ulei-ceară, în două straturi",
    unit: "mp",
    includes:
      "Șlefuirea fină, desprăfuirea, aplicarea uleiului în două straturi și lustruirea surplusului.",
    measurement: "Suprafața uleiată.",
    resources: [uleiParchet(0.1), parchetar(0.2)],
  },
  {
    code: "DV-PRD-23",
    category,
    title:
      "Pardoseală din covor PVC eterogen de 2 mm, lipit, cu rosturile sudate",
    unit: "mp",
    includes:
      "Croirea și aclimatizarea covorului, lipirea cu adeziv acrilic, presarea cu rola, frezarea și sudarea rosturilor cu cordon.",
    excludes: "Egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      covorPvc(1.08),
      adezivCovor(0.35),
      cordonSudura(0.8),
      parchetar(0.45),
      necalificat(0.1),
      aerCald(0.1),
    ],
  },
  {
    code: "DV-PRD-24",
    category,
    title: "Pardoseală vinilică LVT, lipită pe șapă egalizată",
    unit: "mp",
    includes:
      "Trasarea, întinderea adezivului, lipirea lamelelor sau a dalelor, presarea cu rola și tăieturile.",
    excludes: "Egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      lvt(1.06),
      adezivCovor(0.35),
      parchetar(0.5),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-PRD-25",
    category,
    title: "Mochetă de trafic intens, lipită",
    unit: "mp",
    includes:
      "Croirea, lipirea cu adeziv acrilic, presarea cu rola și tăieturile la margini și la praguri.",
    excludes: "Egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      mocheta(1.08),
      adezivCovor(0.35),
      parchetar(0.35),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-PRD-26",
    category,
    title:
      "Pardoseală din linoleum natural de 2,5 mm, lipit, cu rosturile sudate",
    unit: "mp",
    includes:
      "Croirea și aclimatizarea, lipirea cu adeziv acrilic, presarea cu rola, frezarea și sudarea rosturilor cu cordon.",
    excludes: "Egalizarea șapei; plintele.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      linoleum(1.08),
      adezivCovor(0.35),
      cordonSudura(0.8),
      parchetar(0.5),
      necalificat(0.1),
      aerCald(0.1),
    ],
  },
  {
    code: "DV-PRD-27",
    category,
    title:
      "Pardoseală industrială din beton C25/30 de 15 cm, armat cu fibre metalice, elicopterizat cu cuarț, cu rosturi tăiate",
    unit: "mp",
    includes:
      "Folia de separare, turnarea betonului cu fibre, vibrarea și nivelarea, durificatorul de cuarț și finisarea cu elicopterul, tăierea și chituirea rosturilor.",
    excludes:
      "Stratul de balast; termoizolația; armăturile suplimentare din proiect.",
    measurement: "Suprafața pardoselii.",
    resources: [
      foliePolietilena(1.1),
      betonC25(0.155),
      fibreMetalice(4),
      cuart(4),
      chitPoliuretanic(0.05),
      betonist(0.45),
      necalificat(0.3),
      pompaBeton(0.012),
      vibrator(0.03),
      elicopterBeton(0.08),
      masinaTaiatRosturi(0.02),
    ],
  },
  {
    code: "DV-PRD-28",
    category,
    title:
      "Pardoseală epoxidică autonivelantă de 2 mm, cu amorsă, pe beton șlefuit",
    unit: "mp",
    includes:
      "Șlefuirea betonului cu aspirare, amorsa epoxidică cu nisip de cuarț presărat, turnarea și întinderea rășinii, dezaerarea cu rola cu țepi.",
    excludes: "Reparațiile betonului; rosturile de dilatație.",
    measurement: "Suprafața pardoselii.",
    resources: [
      amorsaEpoxidica(0.35),
      nisipCuartos(1),
      rasinaEpoxidica(3.2),
      vopsitor(0.5),
      necalificat(0.15),
      masinaSlefuitBeton(0.05),
    ],
  },
  {
    code: "DV-PRD-29",
    category,
    title:
      "Vopsea epoxidică pentru pardoseli de beton, cu amorsă, în două straturi",
    unit: "mp",
    includes:
      "Șlefuirea și desprăfuirea betonului, amorsa epoxidică și două straturi de vopsea aplicate cu rola.",
    measurement: "Suprafața vopsită.",
    resources: [
      amorsaEpoxidica(0.2),
      vopseaEpoxidica(0.35),
      vopsitor(0.2),
      necalificat(0.05),
      masinaSlefuitBeton(0.03),
    ],
  },
  {
    code: "DV-PRD-30",
    category,
    title: "Profil de dilatație montat în pardoseli placate",
    unit: "m",
    includes:
      "Fixarea profilului în adeziv odată cu placajul, la cota pardoselii.",
    measurement: "Lungimea profilului.",
    resources: [profilDilatatie(1.05), faiantar(0.3)],
  },
  {
    code: "DV-PRD-31",
    category,
    title: "Profil de trecere din aluminiu între pardoseli, fixat cu dibluri",
    unit: "m",
    includes: "Tăierea la lungime, găurirea și fixarea profilului.",
    measurement: "Lungimea profilului.",
    resources: [profilTrecere(1.05), dibluCui(3), parchetar(0.15)],
  },
  {
    code: "DV-PRD-32",
    category,
    title: "Plintă din lemn masiv, montată cu cleme sau adeziv",
    unit: "m",
    includes:
      "Tăierea la unghi, montarea plintei, colțurile și capetele, chituirea îmbinărilor.",
    measurement: "Lungimea plintei.",
    resources: [plintaLemn(1.05), smallMaterials(5), parchetar(0.15)],
  },
  {
    code: "DV-PRD-33",
    category,
    title:
      "Trepte și contratrepte din lemn masiv, lipite pe scări de beton, lăcuite",
    unit: "buc",
    includes:
      "Egalizarea treptei de beton, lipirea treptei și a contratreptei cu adeziv poliuretanic, șlefuirea și lăcuirea.",
    excludes: "Balustrada.",
    measurement: "Numărul de trepte.",
    resources: [
      treaptaLemn(1),
      adezivParchet(1.5),
      lacParchet(0.2),
      parchetar(1.5),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-PRD-34",
    category,
    title:
      "Pardoseală tehnică supraînălțată, pe structură cu picioare reglabile",
    unit: "mp",
    includes:
      "Trasarea, montarea picioarelor și a traverselor la nivel, așezarea plăcilor și tăieturile la margini.",
    measurement: "Suprafața pardoselii.",
    resources: [pardosealaTehnica(1), montatorGips(0.5), necalificat(0.15)],
  },
  {
    code: "DV-PRD-35",
    category,
    title:
      "Covor de cauciuc pentru săli de sport, lipit cu adeziv poliuretanic",
    unit: "mp",
    includes:
      "Croirea și aclimatizarea covorului, lipirea cu adeziv bicomponent, presarea cu rola și tăieturile.",
    excludes: "Egalizarea șapei; marcajele.",
    measurement: "Suprafața pardoselii.",
    resources: [
      covorCauciuc(1.05),
      adezivSportiv(0.6),
      parchetar(0.5),
      necalificat(0.15),
    ],
  },
];
