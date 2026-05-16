// Seeds 3 more registrations: Associação Nikkei Niterói, Maverick Pilar do
// Sul, Piranema. Forms are from the 2026 season — see README note in main
// commit. Idempotent: each team upserted by code, roster wiped + reinserted.
//
// Usage: node scripts/seed-teams-batch2.js

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/mTeam");
const Player = require("../models/mPlayer");

const TOURNAMENT = "Taça Brasil Amador 2026";

const R = "right", L = "left", S = "switch";

const teams = [
  {
    team: {
      name: "Associação Nikkei Niterói",
      code: "ANN",
      imageFile: "ann",
      location: "Niterói - RJ",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [
        { name: "Eric Eiji Kunigami", role: "head" },
        { name: "Cláudio Sakamoto", role: "assistant" },
      ],
    },
    roster: [
      { rosterNumber: 1,  jerseyNumber: 11, name: "Eric Eiji Kunigami",                            throws: R, bats: R },
      { rosterNumber: 2,                    name: "Paulo Luiz dos Santos Filho",                   throws: L, bats: R },
      { rosterNumber: 3,                    name: "Lucas Cesar de Oliveira de Jesus Silva",        throws: R, bats: R },
      { rosterNumber: 4,  jerseyNumber: 66, name: "Romulo Rebello Quedinho",                       throws: L, bats: L },
      // * prefix on form — likely "estrangeiro" tag.
      { rosterNumber: 5,  jerseyNumber: 10, name: "*Jolnel David Aparicio Chaparro",               throws: R, bats: R },
      { rosterNumber: 6,                    name: "Felipe Carneiro da Silva Manhães",              throws: R, bats: L },
      { rosterNumber: 7,  jerseyNumber: 24, name: 'Lucas Menezes Coutinho',  nickname: "Lukita",   throws: R, bats: R },
      { rosterNumber: 8,                    name: "Paulo Kenzo Sakamoto",                          throws: R, bats: R },
      { rosterNumber: 9,                    name: "Charles Takeshi Kuramoto",                      throws: R, bats: R },
      { rosterNumber: 10,                   name: "Mauricio Campos Gonzalez",                      throws: R, bats: R },
      { rosterNumber: 11, jerseyNumber: 97, name: "Nelson Yuji",                                   throws: R, bats: R },
      { rosterNumber: 12, jerseyNumber: 35, name: "Claudio Alessandro Massamitsu Sakamoto",        throws: R, bats: R },
      { rosterNumber: 13,                   name: "André Roberto Boian Konno",                     throws: R, bats: R },
      { rosterNumber: 14,                   name: "Lucas de Oliveira",                             throws: R, bats: R },
      { rosterNumber: 15, jerseyNumber: 45, name: "Milton Coji Ito",                               throws: L, bats: L },
      { rosterNumber: 16,                   name: "*Chay Villalta",                                throws: R, bats: R },
    ],
  },

  {
    team: {
      name: "Maverick Pilar do Sul",
      code: "MPS",
      imageFile: "mps",
      location: "Pilar do Sul - SP",
      division: "2",
      tournament: TOURNAMENT,
      coaches: [
        { name: "Fernando Toshiaki Toyoda", role: "head" },
        { name: "Cesar P. W. Lee", role: "assistant" },
      ],
    },
    // Form had R column blank for all players; only A (bats) captured.
    // jerseyNumber 0 on form is treated as unassigned.
    roster: [
      { rosterNumber: 1,  jerseyNumber: 96, name: "*Cesar P. W. Lee",                       bats: R },
      { rosterNumber: 2,  jerseyNumber: 78, name: "*Ciro Rafael Basanta Solano",             bats: R },
      { rosterNumber: 3,  jerseyNumber: 21, name: "Fernando Toshiaki Toyoda",                bats: R },
      { rosterNumber: 4,                    name: "Flávio Shimada",                          bats: R },
      { rosterNumber: 5,  jerseyNumber: 14, name: "Hanser Ferrer Álvarez",                   bats: R },
      { rosterNumber: 6,                    name: "Wolvin José Yegres Brito",                bats: R },
      { rosterNumber: 7,  jerseyNumber: 89, name: "Kassio Alves de Almeida Silva",           bats: R },
      { rosterNumber: 8,                    name: "Leonardo Makoto Suyama",                  bats: R },
      { rosterNumber: 9,  jerseyNumber: 6,  name: "Marcus Vinicius de Oliveira",             bats: R },
      { rosterNumber: 10, jerseyNumber: 16, name: "*Ronnal Gregorick",                       bats: R },
      { rosterNumber: 11,                   name: "Vagner de Oliveira Conhariki",            bats: R },
      { rosterNumber: 12, jerseyNumber: 13, name: "Rafael Toninhas Shimoyama",               bats: R },
      { rosterNumber: 13,                   name: "Camila Harumi de Moura Watanabe",         bats: R },
      { rosterNumber: 14,                   name: "Lucas Kazumi Xavier Hojo",                bats: R },
      { rosterNumber: 15, jerseyNumber: 2,  name: "Cássio Hideki Myazawa",                   bats: R },
      { rosterNumber: 16,                   name: "Raydel Ricardo Rodrigues Garcia",         bats: R },
    ],
  },

  {
    team: {
      name: "Piranema",
      code: "PRN",
      imageFile: "prn",
      // Itaguaí - RJ is where the Piranema neighborhood is, but I'm not sure
      // this team is from there — leaving blank for confirmation.
      division: "2",
      tournament: TOURNAMENT,
      coaches: [{ name: "Diego Masayuki Nishio", role: "head" }],
    },
    // Form has no jerseys, throws/bats, birth dates, or RGs — just names.
    roster: [
      { rosterNumber: 1,  name: "Diego Masayuki Nishio" },
      { rosterNumber: 2,  name: "Carlos Felipe da Silva de Alvarenga" },
      { rosterNumber: 3,  name: "Caio Tadashi da Silva Nishio" },
      { rosterNumber: 4,  name: "Edson Yukio Nishio" },
      { rosterNumber: 5,  name: "Felipe Matsunaga" },
      { rosterNumber: 6,  name: "Maycon Santana Matsunaga" },
      { rosterNumber: 7,  name: "Adriano Philadelpho Uesu" },
      { rosterNumber: 8,  name: "Gerson Thurler Pereira" },
      { rosterNumber: 9,  name: "Victor Yan Chaves Wildhagen" },
      { rosterNumber: 10, name: "Fernando Augusto Machado Correa" },
      { rosterNumber: 11, name: "Hélio Hideki Sato" },
      { rosterNumber: 12, name: "Jonathas David Rodrigues Barros" },
      { rosterNumber: 13, name: "Samuel Silva da Rocha Reis" },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("connected");

  await Player.syncIndexes();

  for (const { team, roster } of teams) {
    const t = await Team.findOneAndUpdate(
      { code: team.code },
      { $set: team },
      { upsert: true, new: true }
    );
    await Player.deleteMany({ team: t._id });
    const docs = roster.map((p) => ({ team: t._id, ...p }));
    await Player.insertMany(docs);
    console.log(`✓ ${t.code.padEnd(4)} ${t.name.padEnd(28)} roster=${docs.length}`);
  }

  const all = await Team.find({}, { code: 1, slot: 1, name: 1, tournament: 1 }).sort({ code: 1 });
  console.log("\nteams in DB:");
  for (const t of all) {
    console.log(`  ${t.code.padEnd(4)} ${(t.slot || "-").padEnd(3)} ${t.name.padEnd(28)} ${t.tournament || ""}`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
