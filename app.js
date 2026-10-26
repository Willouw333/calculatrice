"use strict";

/* ====================================================
   Calculatrice PWA - logique
   ==================================================== */

const affichage = document.getElementById("affichage");
const boutonsOperateurs = document.querySelectorAll("[data-op]");

let courant = "0";       // nombre en cours de saisie (toujours avec un point décimal)
let precedent = null;    // premier opérande
let operateur = null;    // opération en attente : + - * /
let nouveau = false;     // le prochain chiffre démarre un nouveau nombre

const MAX_CHIFFRES = 12;

/* ---------- Affichage ---------- */

// 1234567.5 -> "1 234 567,5" (espace fine insécable, virgule décimale)
function formaterPourAffichage(texte) {
  if (texte === "Erreur") return texte;
  if (texte.includes("e")) return texte.replace(".", ",");

  const negatif = texte.startsWith("-");
  const corps = negatif ? texte.slice(1) : texte;
  const [entier, decimales] = corps.split(".");
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  const resultat = decimales !== undefined ? groupe + "," + decimales : groupe;
  return (negatif ? "-" : "") + resultat;
}

// Réduit la taille de la police si le nombre est trop long pour l'écran
function ajusterTaille() {
  affichage.style.fontSize = "";
  let taille = parseFloat(getComputedStyle(affichage).fontSize);
  while (affichage.scrollWidth > affichage.clientWidth && taille > 20) {
    taille -= 2;
    affichage.style.fontSize = taille + "px";
  }
}

function majAffichage() {
  affichage.textContent = formaterPourAffichage(courant);
  ajusterTaille();
  boutonsOperateurs.forEach((b) => {
    b.classList.toggle("actif", operateur !== null && nouveau && b.dataset.op === operateur);
  });
}

/* ---------- Outils ---------- */

function formater(nombre) {
  return String(parseFloat(nombre.toPrecision(12)));
}

function nombreValide() {
  return !isNaN(parseFloat(courant));
}

function nombreDeChiffres() {
  return courant.replace(/[^0-9]/g, "").length;
}

/* ---------- Actions ---------- */

function toutEffacer() {
  courant = "0";
  precedent = null;
  operateur = null;
  nouveau = false;
}

function erreur() {
  toutEffacer();
  courant = "Erreur";
  nouveau = true;
}

function saisirChiffre(chiffre) {
  if (nouveau) {
    courant = "0";
    nouveau = false;
  }
  if (nombreDeChiffres() >= MAX_CHIFFRES) return;
  if (courant === "0") courant = chiffre;
  else if (courant === "-0") courant = "-" + chiffre;
  else courant += chiffre;
}

function saisirVirgule() {
  if (nouveau) {
    courant = "0";
    nouveau = false;
  }
  if (!courant.includes(".")) courant += ".";
}

function calculer() {
  const a = precedent;
  const b = parseFloat(courant);
  let resultat;
  switch (operateur) {
    case "+": resultat = a + b; break;
    case "-": resultat = a - b; break;
    case "*": resultat = a * b; break;
    case "/": resultat = b === 0 ? null : a / b; break;
    default: resultat = b;
  }
  if (resultat === null || !isFinite(resultat)) return null;
  return resultat;
}

function choisirOperateur(op) {
  if (!nombreValide()) return;
  if (operateur && !nouveau) {
    const resultat = calculer();
    if (resultat === null) return erreur();
    precedent = resultat;
    courant = formater(resultat);
  } else if (!operateur) {
    precedent = parseFloat(courant);
  }
  operateur = op;
  nouveau = true;
}

function egal() {
  if (!operateur || !nombreValide()) return;
  const resultat = calculer();
  if (resultat === null) return erreur();
  courant = formater(resultat);
  precedent = null;
  operateur = null;
  nouveau = true;
}

function pourcentage() {
  if (!nombreValide()) return;
  courant = formater(parseFloat(courant) / 100);
}

function inverserSigne() {
  if (!nombreValide()) return;
  if (nouveau && operateur) {
    // Juste après un opérateur : on commence un nombre négatif
    courant = "-0";
    nouveau = false;
    return;
  }
  if (courant === "0") return;
  courant = courant.startsWith("-") ? courant.slice(1) : "-" + courant;
}

function effacerDernier() {
  if (nouveau) return;
  if (courant.length <= 1 || (courant.length === 2 && courant[0] === "-")) {
    courant = "0";
  } else {
    courant = courant.slice(0, -1);
  }
}

/* ---------- Entrées : boutons ---------- */

document.querySelector(".calculatrice").addEventListener("click", (e) => {
  const bouton = e.target.closest("button");
  if (!bouton) return;

  if (bouton.dataset.digit !== undefined) {
    saisirChiffre(bouton.dataset.digit);
  } else if (bouton.dataset.op) {
    choisirOperateur(bouton.dataset.op);
  } else {
    switch (bouton.dataset.action) {
      case "clear": toutEffacer(); break;
      case "back": effacerDernier(); break;
      case "percent": pourcentage(); break;
      case "sign": inverserSigne(); break;
      case "decimal": saisirVirgule(); break;
      case "equals": egal(); break;
    }
  }
  majAffichage();
});

/* ---------- Entrées : clavier (ordinateur) ---------- */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key >= "0" && e.key <= "9") saisirChiffre(e.key);
  else if (e.key === "." || e.key === ",") saisirVirgule();
  else if (["+", "-", "*", "/"].includes(e.key)) choisirOperateur(e.key);
  else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); egal(); }
  else if (e.key === "Backspace") effacerDernier();
  else if (e.key === "Escape") toutEffacer();
  else if (e.key === "%") pourcentage();
  else return;

  majAffichage();
});

window.addEventListener("resize", ajusterTaille);

majAffichage();

/* ---------- Service worker (fonctionnement hors ligne) ---------- */

const contexteSecurise =
  location.protocol === "https:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && contexteSecurise) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker non enregistré :", err);
    });
  });
}
