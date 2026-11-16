export const topics = [
  {
    name: "Politique",
    subtopics: ["Présidentielle", "Élections", "Institutions"],
  },
  { name: "International", subtopics: ["Diplomatie", "Conflits"] },
  { name: "Économie", subtopics: ["Marchés", "Entreprises", "Emploi"] },
  { name: "Société", subtopics: ["Justice", "Éducation"] },
  { name: "Sport", subtopics: ["Football", "Tennis", "Cyclisme"] },
  { name: "Culture", subtopics: ["Cinéma", "Musique", "Littérature"] },
  { name: "Sciences et technologies", subtopics: ["Technologie", "Sciences"] },
  { name: "Environnement", subtopics: ["Climat", "Biodiversité", "Énergie"] },
  { name: "Santé", subtopics: ["Médecine", "Santé publique"] },
  { name: "Autres", subtopics: [] },
] as const satisfies readonly { name: string; subtopics: readonly string[] }[];
