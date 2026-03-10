// app/lib/dictionary.ts

const TOXIC_DICTIONARY = [
  "falourmama", "flmm", "fes", "pute", "fatra", "lerni", "bourrer", "lernie", "guel", "bouro", "bourre", "fairfoot" ,"bbit", "tiourel", "tiurel", "boussou", "bousou", "suss", "laryiaz", "lgsm", "zaza", "zazer", "couyonnade", "marday", "lagrain", "langouti", "languti", "tonkenny", "tonkeny", "tonkin", "gopiah", "mardail", "bez", "bezer", "beZ", "mardaille", "pagla", "fesse", "salo", "peelon", "souC", "dildo", "pis", "BLD", "lonpi", "piaow", "kuyunad", "lki", "piln", "flztmama", "fss", "gofiole", "couyonade", "kuyonade", "flzmama", "guele", "pise", "guelle", "piow", "souse", "suce", "sus", "laguelle", "flrmma", "gofiol", "nisa", "nissa", "couillon", "batard", "troumaille", "gamat", "gamatte", "trumaille", "trou maile", "trumaille", "trou maille", "batar", "bobok", "toutoune", "tutune", "toutune", "bobk", "sousoute", "susute", "bourik", "burik", "zako", "zaco", "caca", "tata", "gogotrie", "lasarine",  "souser", "difoute", "difoutte", "difout", "zizi", "putain", "suser", "zozo", "salop", "salope", "languet", "troufess", "trufess", "gren", "koke", "koker", "troufes", "tf", "trufes", "bourer", "kuyon", "kouyon", "burer", "boufon", "bufon", "gogote", "malabar", "laskar", "goggt", "pilone", "malbar", "fess", "madras", "lascar", "torma", "trma", "trpa", "torpa", "mrma", "mrpa", "morma", "morpa", "liki", "likimama", "kkliki", "kklkl", "kklk", "bibit", "foutou", "foutourva", "foutouva", "futurva", "pissar", "pissr", "pisser", "piss", "piC", "bachara", "zoive", "gopia", "piago", "laryaz", "ferfout", "ferfut", "frfut", "frfout", "btl", "btf", "smk", "kok", "tikok", "grokok", "flsrma", "falursrma", "plok", "ploc", "makro", "macro", "makrel", "macrel", "touksrma", "touksorma", "busufess", "tuksrma", "tuksorma", "batiara", "kakaliki", "ggt", "laguel", "trouliki", "kk", "kaka", "sousout", "susut", "pitin", "ptn", "pln", "pilon", "langet", "fbt", "bour", "gogot"
];

export function checkDictionary(text: string): string[] {
  return TOXIC_DICTIONARY.filter((word) => {
    const regexPattern = word.split('').map(char => char + '+').join('\\s*');
    
    const regex = new RegExp(`\\b${regexPattern}\\b`, 'i');   
    
    return regex.test(text);
  });
}