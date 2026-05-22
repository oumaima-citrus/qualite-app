import { supabase } from './supabaseClient';
import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import "./App.css";
import Toolbar from "./components/Toolbar";
import LotCard from "./components/LotCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const defectOptions = [
 "Défaut de coloration (vert)",
  "Marbrures",
  "Blessures",
  "Pédoncule long > 3mm",
  "Affaissement de calice",
  "Frottement",
  "Piqûres d’insecte",
  "Coup de soleil",
  "F. sans calice",
  "Dégâts escargots",
  "Gaufrage",
  "Dégât de grêle",
  "Brunissement",
  "Fruit écrasé",
  "Peau rugueuse",
  "Thrips",
  "Corail",
  "Tordeuse",
  "Boursouflurement",
  "Acariens",
  "F. déformés",
  "Blessures de pince",
  "Fruit mou",
  "Autres",
];

function App() {
  const LOGIN_USERNAME = "admin";
  const LOGIN_PASSWORD = "1234";

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("qc_logged_in") === "true"
  );

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [observation, setObservation] = useState("");
  const [decision, setDecision] = useState("Conforme");
  const [controleurName, setControleurName] = useState("");
  const [controleId, setControleId] = useState("");
  const [signature, setSignature] = useState("");
  const [seuilConforme, setSeuilConforme] = useState(
    localStorage.getItem("seuilConforme") || "5"
  );

  const [seuilVerifier, setSeuilVerifier] = useState(
    localStorage.getItem("seuilVerifier") || "10"
  );

  const [maxPhotos, setMaxPhotos] = useState(
    localStorage.getItem("maxPhotos") || "4"
  );

  const [campagneDefault, setCampagneDefault] = useState(
    localStorage.getItem("campagneDefault") || "2026/2027"
  );
  const [pdfQuality, setPdfQuality] = useState("high");
  const today = new Date().toISOString().split("T")[0];
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [dashboardDate, setDashboardDate] = useState(today);
  const [darkMode, setDarkMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [dashboardPeriod, setDashboardPeriod] = useState("day");
  const [dashboardLot, setDashboardLot] = useState("Tous");
  const [history, setHistory] = useState([]);
  const [openDate, setOpenDate] = useState(null);
  const [openLot, setOpenLot] = useState(null);
  const [showPhotosInPdf, setShowPhotosInPdf] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editType, setEditType] = useState(null);
  useEffect(() => {
    loadHistory();
  }, []);
  const [lot, setLot] = useState({
    campagne: "2026/2027",
    date: today,
    numero: "",
    variete: "",
    producteur: "",
    ferme: "",
  });

  const [pfCalibre, setPfCalibre] = useState("");
  const [pfTotal, setPfTotal] = useState(0);
  const [pfNonConforme, setPfNonConforme] = useState(0);
  const [showPfTable, setShowPfTable] = useState(false);

  const [ecartCalibre, setEcartCalibre] = useState("");
  const [ecartTotal, setEcartTotal] = useState(0);
  const [ecartConforme, setEcartConforme] = useState(0);
  const [showEcartTable, setShowEcartTable] = useState(false);

  const [defects, setDefects] = useState([{ type: "", qty: 0, photos: [] }]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoDefectIndex, setPhotoDefectIndex] = useState(null);

  const pfConforme = Math.max(pfTotal - pfNonConforme, 0);
  const pfTauxConforme =
    pfTotal > 0 ? ((pfConforme / pfTotal) * 100).toFixed(2) : 0;
  const pfTauxNonConforme =
    pfTotal > 0 ? ((pfNonConforme / pfTotal) * 100).toFixed(2) : 0;

  const ecartNonConforme = Math.max(ecartTotal - ecartConforme, 0);
  const ecartTauxConforme =
    ecartTotal > 0 ? ((ecartConforme / ecartTotal) * 100).toFixed(2) : 0;
  const ecartTauxNonConforme =
    ecartTotal > 0 ? ((ecartNonConforme / ecartTotal) * 100).toFixed(2) : 0;
  function handleLogin() {
    if (loginUsername === LOGIN_USERNAME && loginPassword === LOGIN_PASSWORD) {
      localStorage.setItem("qc_logged_in", "true");
      setIsLoggedIn(true);
    } else {
      alert("Nom d'utilisateur ou mot de passe incorrect.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("qc_logged_in");
    setIsLoggedIn(false);
    setLoginUsername("");
    setLoginPassword("");
  }
  function saveParametresQualite() {
    localStorage.setItem("seuilConforme", seuilConforme);
    localStorage.setItem("seuilVerifier", seuilVerifier);
    localStorage.setItem("maxPhotos", maxPhotos);
    localStorage.setItem("campagneDefault", campagneDefault);

    setLot({
      ...lot,
      campagne: campagneDefault,
    });

    alert("Paramètres qualité enregistrés avec succès ✅");
  }
  function exportBackup() {
    const allData = JSON.parse(localStorage.getItem("dailyLots")) || {};

    const backup = {
      appName: "Application Contrôle Qualité",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: allData,
    };

    const fileContent = JSON.stringify(backup, null, 2);

    const blob = new Blob([fileContent], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_controle_qualite_${new Date()
      .toISOString()
      .split("T")[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert("Sauvegarde exportée avec succès ✅");
  }
  function exportExcel() {
   
  const allData = {};

const sourceData = history && history.length > 0
  ? history
  : JSON.parse(localStorage.getItem("controls")) || [];

sourceData.forEach((record) => {
  const dateKey = record.date || "Sans date";

  if (!allData[dateKey]) {
    allData[dateKey] = [];
  }

  allData[dateKey].push(record);
});

    const produit_fini_dataRows = [
      [
        "Date",
        "Heure",
        "Lot",
        "Campagne",
        "Producteur",
        "Ferme",
        "Variété",
        "Calibre",
        "Total",
        "Conforme",
        "Non conforme",
        "Taux conforme",
        "Taux non conforme",
        "Nom contrôleur",
        "ID de contrôle",
        "Signature",
      ],
    ];

    const ecartsRows = [
      [
        "Date",
        "Heure",
        "Lot",
        "Campagne",
        "Producteur",
        "Ferme",
        "Variété",
        "Calibre",
        "Total",
        "Conforme",
        "Non conforme",
        "Taux conforme",
        "Taux non conforme",
        "Nom contrôleur",
        "ID de contrôle",
        "Signature",
      ],
    ];

    const defautsRows = [
      [
        "Date",
        "Heure",
        "Lot",
        "Calibre",
        "Type défaut",
        "Quantité",
        "Producteur",
        "Ferme",
        "Variété",
      ],
    ];

    let totalControles = 0;
    let totalLotsSet = new Set();

    let totalFruits = 0;
    let totalConformes = 0;
    let totalNonConformes = 0;

    const defautsCount = {};
console.log("ALL DATA:", allData);
    Object.keys(allData).forEach((dateKey) => {
      (allData[dateKey] || []).forEach((record) => {
        totalControles += 1;
        totalLotsSet.add(record.lot_number);
console.log("TYPE:", record.type);
console.log("RECORD:", record);
        if (record.type === "pf" && record.produit_fini_data) {
          const total = Number(record.produit_fini_data.total || 0);
          const conforme = Number(record.produit_fini_data.conforme || 0);
          const nonConforme = Number(record.produit_fini_data.nonConforme || 0);

          totalFruits += total;
          totalConformes += conforme;
          totalNonConformes += nonConforme;

          const tauxConforme =
            total > 0 ? ((conforme / total) * 100).toFixed(2) + "%" : "0%";

          const tauxNonConforme =
            total > 0 ? ((nonConforme / total) * 100).toFixed(2) + "%" : "0%";

          produit_fini_dataRows.push([
            record.date || dateKey,
            record.createdAt || "",
            record.lot_number || record.lot ||
            record.campagne || "",
            record.producteur || "",
            record.ferme || "",
            record.variete || "",
            record.produit_fini_data.calibre || "",
            total,
            conforme,
            nonConforme,
            tauxConforme,
            tauxNonConforme,
            record.controleurName || "",
            record.controleId || "",
            record.signature || "",
          ]);
        }

        if (record.type === "ecart" && record.ecarts) {
          const total = Number(record.ecarts.total || 0);
          const conforme = Number(record.ecarts.conforme || 0);
          const nonConforme = Number(record.ecarts.nonConforme || 0);

          totalFruits += total;
          totalConformes += conforme;
          totalNonConformes += nonConforme;

          const tauxConforme =
            total > 0 ? ((conforme / total) * 100).toFixed(2) + "%" : "0%";

          const tauxNonConforme =
            total > 0 ? ((nonConforme / total) * 100).toFixed(2) + "%" : "0%";

          ecartsRows.push([
            record.date || dateKey,
            record.createdAt || "",
            record.lot_number || record.lot ||
            record.campagne || "",
            record.producteur || "",
            record.ferme || "",
            record.variete || "",
            record.ecarts.calibre || "",
            total,
            conforme,
            nonConforme,
            tauxConforme,
            tauxNonConforme,
            record.controleurName || "",
            record.controleId || "",
            record.signature || "",
          ]);

          (record.ecarts.defauts || []).forEach((d) => {
            if (!defautsCount[d.type]) {
              defautsCount[d.type] = 0;
            }

            defautsCount[d.type] += Number(d.qty || 0);

            defautsRows.push([
              record.date || dateKey,
              record.createdAt || "",
              record.lot_number || record.lot ||
              record.ecarts.calibre || "",
              d.type || "",
              Number(d.qty || 0),
              record.producteur || "",
              record.ferme || "",
              record.variete || "",
            ]);
          });
        }
      });
    });

    if (totalControles === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const tauxConformeGlobal =
      totalFruits > 0 ? ((totalConformes / totalFruits) * 100).toFixed(2) + "%" : "0%";

    const tauxNonConformeGlobal =
      totalFruits > 0
        ? ((totalNonConformes / totalFruits) * 100).toFixed(2) + "%"
        : "0%";

    const defautPrincipal =
      Object.keys(defautsCount).length > 0
        ? Object.keys(defautsCount).sort(
          (a, b) => defautsCount[b] - defautsCount[a]
        )[0]
        : "Aucun défaut";

    const resumeRows = [
      ["Résumé général qualité"],
      [],
      ["Date export", new Date().toLocaleString()],
      ["Nombre de lots contrôlés", totalLotsSet.size],
      ["Nombre total de contrôles", totalControles],
      ["Total fruits contrôlés", totalFruits],
      ["Total fruits conformes", totalConformes],
      ["Total fruits non conformes", totalNonConformes],
      ["Taux conforme global", tauxConformeGlobal],
      ["Taux non conforme global", tauxNonConformeGlobal],
      ["Défaut principal", defautPrincipal],
    ];

    const workbook = XLSX.utils.book_new();

    const resumeSheet = XLSX.utils.aoa_to_sheet(resumeRows);
    const produit_fini_dataSheet = XLSX.utils.aoa_to_sheet(produit_fini_dataRows);
    const ecartsSheet = XLSX.utils.aoa_to_sheet(ecartsRows);
    const defautsSheet = XLSX.utils.aoa_to_sheet(defautsRows);

    resumeSheet["!cols"] = [{ wch: 30 }, { wch: 25 }];
    produit_fini_dataSheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
    ];
    ecartsSheet["!cols"] = produit_fini_dataSheet["!cols"];
    defautsSheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, resumeSheet, "Résumé");
    XLSX.utils.book_append_sheet(workbook, produit_fini_dataSheet, "Produit fini");
    XLSX.utils.book_append_sheet(workbook, ecartsSheet, "Écarts");
    XLSX.utils.book_append_sheet(workbook, defautsSheet, "Défauts");

    XLSX.writeFile(
      workbook,
      `rapport_excel_qualite_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    alert("Export Excel professionnel généré avec succès ✅");
  }
  function importBackup(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        const importedData = backup.data || backup;

        if (!importedData || typeof importedData !== "object") {
          alert("Fichier backup invalide.");
          return;
        }

        const confirmImport = window.confirm(
          "Cette opération va remplacer les données actuelles par les données du backup. Voulez-vous continuer ?"
        );

        if (!confirmImport) {
          return;
        }

        localStorage.setItem("dailyLots", JSON.stringify(importedData));

        loadHistory();

        alert("Sauvegarde importée avec succès ✅");
      } catch (error) {
        alert("Erreur lors de l'importation du fichier backup.");
        console.error(error);
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  }
  function updateLot(field, value) {
    setLot({ ...lot, [field]: value });
  }

  function addDefectRow() {
    setDefects([...defects, { type: "", qty: 0, photos: [] }]);
  }
  function onlyNumbers(value) {
    return value.replace(/[^0-9]/g, "");
  }
  function getDecisionAutomatique(tauxNonConforme) {
    const taux = Number(tauxNonConforme) || 0;

    if (taux <= 5) {
      return {
        decision: "Conforme",
        niveau: "Faible",
        message:
          "Taux de non-conformité faible. Le lot est considéré comme conforme.",
      };
    }

    if (taux <= 10) {
      return {
        decision: "À vérifier",
        niveau: "Moyen",
        message:
          "Taux de non-conformité moyen. Le lot nécessite une vérification qualité.",
      };
    }

    return {
      decision: "Non conforme",
      niveau: "Élevé",
      message:
        "Taux de non-conformité élevé. Le lot nécessite une action corrective.",
    };
  }
  function appliquerAlerteAutomatique(tauxNonConforme) {
    const alerte = getDecisionAutomatique(tauxNonConforme);

    setDecision(alerte.decision);

    setObservation((prev) => {
      if (prev && prev.trim() !== "") {
        return prev;
      }

      return alerte.message;
    });

    alert(
      `Alerte qualité automatique : ${alerte.decision}\nNiveau : ${alerte.niveau}\n${alerte.message}`
    );
  }
  function genererObservationJournaliere(records) {
    if (!records || records.length === 0) {
      return "Aucun contrôle enregistré pour cette journée.";
    }

    let totalPF = 0;
    let nonConformePF = 0;

    let totalEcart = 0;
    let nonConformeEcart = 0;

    let totalDefauts = 0;
    const defautsCount = {};
    const latestLot =
      String(records[records.length - 1]?.lot_number || "").trim();

    const filteredRecords = records.filter(
      (r) =>
        String(r.lot_number || "").trim() === latestLot
    );
    const latestRecord =
      filteredRecords[filteredRecords.length - 1];
    filteredRecords.forEach((r) => {
      if (r.type === "pf" && r.produit_fini_data) {
        totalPF += Number(r.produit_fini_data.total || 0);
        nonConformePF += Number(r.produit_fini_data.nonConforme || 0);
      }

      if (r.type === "ecart" && r.ecarts_data) {
        totalEcart += Number(r.non_conforme_total || 0 || 0);
        nonConformeEcart += Number(r.ecarts_data.nonConforme || 0);

        (r.defects_list || []).forEach((d) => {
          totalDefauts += Number(d.qty || 0);

          if (!defautsCount[d.type]) {
            defautsCount[d.type] = 0;
          }

          defautsCount[d.type] += Number(d.qty || 0);
        });
      }
    });

    const totalControle = totalPF + totalEcart;
    const totalNonConforme = nonConformePF + nonConformeEcart;

    const tauxNonConformeGlobal =
      totalControle > 0 ? (totalNonConforme / totalControle) * 100 : 0;

    const defautPrincipal = Object.keys(defautsCount).sort(
      (a, b) => defautsCount[b] - defautsCount[a]
    )[0];

    if (totalControle === 0) {
      return "Les contrôles ont été enregistrés, mais aucune quantité exploitable n’a été saisie.";
    }

    if (tauxNonConformeGlobal <= Number(seuilConforme)) {
      return `Contrôle journalier réalisé. Le taux global de non-conformité est faible (${tauxNonConformeGlobal.toFixed(
        2
      )}%). Le niveau de conformité est satisfaisant.`;
    }

    if (tauxNonConformeGlobal <= Number(seuilVerifier)) {
      return `Contrôle journalier réalisé. Le taux global de non-conformité est moyen (${tauxNonConformeGlobal.toFixed(
        2
      )}%). Un suivi qualité est recommandé${defautPrincipal ? `, notamment pour le défaut : ${defautPrincipal}` : ""
        }.`;
    }

    return `Contrôle journalier réalisé. Le taux global de non-conformité est élevé (${tauxNonConformeGlobal.toFixed(
      2
    )}%). Une vérification approfondie est nécessaire${defautPrincipal ? `, avec une attention particulière au défaut : ${defautPrincipal}` : ""
      }.`;
  }
  function clearZero(value, setter) {
    if (String(value) === "0") {
      setter("");
    }
  }

  function restoreZero(value, setter) {
    if (String(value).trim() === "") {
      setter(0);
    }
  }
  function updateDefect(index, field, value) {
    const copy = [...defects];
    copy[index][field] = value;
    setDefects(copy);
  }
  async function openCamera(index) {
    setPhotoDefectIndex(index);
    setCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("هاد المتصفح لا يدعم الكاميرا.");
        setCameraOpen(false);
        return;
      }

      // نسدو أي كاميرا قديمة
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }

      let stream;

      try {
        // محاولة أولى (للهاتف)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });
      } catch (e) {
        // fallback مهم للـ PC
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      cameraStreamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 300);
    } catch (error) {
      console.error(error);
      alert("Problème de caméra. Veuillez vérifier que l’accès à la caméra est autorisé.");
      setCameraOpen(false);
      setPhotoDefectIndex(null);
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || photoDefectIndex === null) {
      return;
    }
    const currentDefect = defects[photoDefectIndex];

    if (!currentDefect.type) {
      alert("Veuillez choisir le type de défaut avant de prendre une photo.");
      return;
    }

    const sameTypePhotosCount = defects
      .filter((d) => d.type === currentDefect.type)
      .reduce((total, d) => {
        return total + ((d.photos && d.photos.length) || 0);
      }, 0);

    if (sameTypePhotosCount >= 4) {
      alert("Ce type de défaut a déjà atteint le maximum de 4 photos.");
      closeCamera();
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      alert("Patientez un instant jusqu’à ce que l’image apparaisse dans la caméra.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.85);

    const copy = [...defects];

    copy[photoDefectIndex] = {
      ...copy[photoDefectIndex],
      photos: [...(copy[photoDefectIndex].photos || []), imageData],
    };

    setDefects(copy);
    closeCamera();

    setDefects(copy);
    closeCamera();
  }

  function deletePhotoFromDefect(defectIndex, photoIndex) {
    const copy = [...defects];

    copy[defectIndex] = {
      ...copy[defectIndex],
      photos: (copy[defectIndex].photos || []).filter(
        (_, index) => index !== photoIndex
      ),
    };

    setDefects(copy);
  }
  function closeCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setPhotoDefectIndex(null);
  }
  function newLot() {
    setLot({
      campagne: "2026/2027",
      date: today,
      numero: "",
      variete: "",
      producteur: "",
      ferme: "",
    });
    setPfCalibre("");
    setPfTotal(0);
    setPfNonConforme(0);
    setShowPfTable(false);
    setEcartCalibre("");
    setEcartTotal(0);
    setEcartConforme(0);
    setShowEcartTable(false);
    setDefects([{ type: "", qty: 0, photos: [] }]);
    setEditIndex(null);
    setEditType(null);
    setPage(1);
  }
  function resetControleFields(type) {
    if (type === "pf") {
      setPfCalibre("");
      setPfTotal(0);
      setPfNonConforme(0);
      setShowPfTable(false);
    }

    if (type === "ecart") {
      setEcartCalibre("");
      setEcartTotal(0);
      setEcartConforme(0);
      setShowEcartTable(false);
      setDefects([{ type: "", qty: 0, photos: [] }]);
    }
  }

  async function saveLotData(type) {
    console.log("saveLotData khdama");
    console.log(lot);

    const record = {
      lot_number: String(lot.numero),
      campagne: lot.campagne,
      calibre: pfCalibre || ecartCalibre || "-",
      producteur: lot.producteur,
      ferme: lot.ferme,
      variete: lot.variete,
      controleur_name: controleurName,
      controle_id: controleId,
      signature: signature,
      type: type,
      produit_fini_data:
        type === "pf"
          ? {
            calibre: pfCalibre,
            total: pfTotal,
            conforme: pfConforme,
            nonConforme: pfNonConforme,
          }
          : null,

      ecarts_data:
        type === "ecart"
          ? {
            calibre: ecartCalibre,
            total: ecartTotal,
            conforme: ecartConforme,
            nonConforme: ecartNonConforme,
          }
          : null,

      defects_list:
        type === "ecart"
          ? defects.filter((d) => d.type && Number(d.qty) > 0)
          : [],
    };

    try {
      const { error } = await supabase
        .from("controls")
        .insert([record]);

      if (error) throw error;

      console.log("Cloud saved!");
    } catch (err) {
      console.error(err);
    }

    alert("le controle enregistrer ");
    resetControleFields(type);
  }

  async function loadHistory() {
    const { data, error } = await supabase
      .from("controls")
      .select("*")
      .order("created_at", { ascending: false });
    console.log(data);
    if (error) {
      console.error("Erreur chargement:", error);
      return;
    }

    setHistory(data || []);
  }

  function openHistory() {
    loadHistory();
    setPage(5);
  }

  async function deleteRecord(recordOrIndex) {

    const allData = JSON.parse(localStorage.getItem("dailyLots")) || {};

    const recordToDelete =
      typeof recordOrIndex === "number"
        ? history[recordOrIndex]
        : recordOrIndex;

    if (!recordToDelete) return;

    const recordDate =
      recordToDelete.date ||
      recordToDelete.dateKey ||
      lot.date;

    const records = allData[recordDate] || [];

    allData[recordDate] = records.filter(
      (r) => r.id !== recordToDelete.id
    );

    localStorage.setItem("dailyLots", JSON.stringify(allData));

    // supprimer mn supabase
    await supabase
      .from("controls")
      .delete()
      .eq("id", recordToDelete.id);

    loadHistory();
  }
  function editRecord(recordOrIndex) {
    const record =
      typeof recordOrIndex === "number" ? history[recordOrIndex] : recordOrIndex;

    if (!record) return;

    const allData = JSON.parse(localStorage.getItem("dailyLots")) || {};
    const recordDate = record.date || record.dateKey || lot.date;
    const recordsOfDate = allData[recordDate] || [];
    const realIndex = recordsOfDate.findIndex((r) => r.id === record.id);

    setEditIndex(realIndex);
    setEditType(record.type);
    setLot({
      campagne: record.campagne || "2026/2027",
      date: record.date || today,
      numero: record.lot || "",
      variete: record.variete || "",
      producteur: record.producteur || "",
      ferme: record.ferme || "",
    });

    if (record.type === "pf") {

      setControleurName(record.controleur_name || "");

      setPfCalibre(
        record.calibre ||
        record.produit_fini_data?.calibre ||
        record.produit_fini_data?.calibre ||
        ""
      );

      setPfTotal(
        Number(
          record.produit_fini_data?.total ||
          record.produit_fini_data?.total ||
          0
        )
      );

      setPfNonConforme(
        Number(
          record.produit_fini_data?.nonConforme ||
          record.produit_fini_data?.nonConforme ||
          0
        )
      );

      setShowPfTable(true);
      setPage(3);
    }
  }
  function waitForImages(container) {
    const images = Array.from(container.querySelectorAll("img"));

    return Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  }
  async function generateDailyReport() {
    console.log("PDF SAVE");
    const { data: records, error } = await supabase
      .from("controls")
      .select("*")
      .gte("created_at", dashboardDate + "T00:00:00")
      .lte("created_at", dashboardDate + "T23:59:59");
    console.log(records);


    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    if (records.length === 0) {
      alert("Aucun contrôle enregistré à cette date");
      return;
    }
    const observationFinale =
      observation && observation.trim() !== ""
        ? observation
        : genererObservationJournaliere(records);
    const recordsByLot = {};

    let totalLotsSet = new Set();

    console.log("RECORDS PDF:", records);
    records.forEach((record) => {
      totalLotsSet.add(record.lot_number);
      const lotNumber =
        String(record.lot_number || record.lot || "").trim() ||
        "Sans numéro de lot";

      if (!recordsByLot[lotNumber]) {
        recordsByLot[lotNumber] = [];
      }

      recordsByLot[lotNumber].push(record);
    });
    let lotSections = "";
    const pfGrouped = {};
    const ecartGrouped = {};
    const defectGrouped = {};
    const illustrationGrouped = {};
    let totalEcartNonConformeDay = 0;
    let illustrationRows = "";
    Object.keys(recordsByLot).forEach((lotNumber) => {
      const lotRecords = recordsByLot[lotNumber];

      const pfGrouped = {};
      const ecartGrouped = {};
      const defectGrouped = {};
      const illustrationGrouped = {};
      let totalEcartNonConformeDay = 0;
      let illustrationRows = "";

      const firstRecord = lotRecords[0];
      console.log("FIRST RECORD:", firstRecord);
      console.log("DATE TEST:", firstRecord.date, firstRecord.created_at);
      const lotDate = firstRecord.created_at?.split("T")[0] || "-";

      const lotCampagne = firstRecord.campagne || "-";
      const lotProducteur = firstRecord.producteur || "-";
      const lotFerme = firstRecord.ferme || "-";
      const lotVariete = firstRecord.variete || "-";
      const lotControleurName = firstRecord.controleur_name || "-";
      const lotControleId = firstRecord.controle_id || "-";
      const lotSignature = firstRecord.signature || "-";

      lotRecords.forEach((r) => {

        if (r.type === "pf" && r.produit_fini_data) {
          const calibre = r.produit_fini_data.calibre || "Sans calibre";

          if (!pfGrouped[calibre]) {
            pfGrouped[calibre] = {
              caisses: 0,
              total: 0,
              conforme: 0,
              nonConforme: 0,
            };
          }

          pfGrouped[calibre].caisses += 1;
          pfGrouped[calibre].total += Number(r.produit_fini_data.total || 0);
          pfGrouped[calibre].conforme += Number(r.produit_fini_data.conforme || 0);
          pfGrouped[calibre].nonConforme += Number(r.produit_fini_data.nonConforme || 0);
        }

        if (r.type === "ecart" && r.ecarts_data) {
          const calibre = r.ecarts_data.calibre || "Sans calibre";

          if (!ecartGrouped[calibre]) {
            ecartGrouped[calibre] = {
              caisses: 0,
              total: 0,
              conforme: 0,
              nonConforme: 0,
            };
          }

          ecartGrouped[calibre].caisses += 1;
          ecartGrouped[calibre].total += Number(r.ecarts_data.total || 0);
          ecartGrouped[calibre].conforme += Number(r.ecarts_data.conforme || 0);
          ecartGrouped[calibre].nonConforme += Number(r.ecarts_data.nonConforme || 0);

          totalEcartNonConformeDay += Number(r.ecarts_data.nonConforme || 0);
          r.defects_list.forEach((d) => {
            if (!defectGrouped[d.type]) defectGrouped[d.type] = 0;
            defectGrouped[d.type] += Number(d.qty || 0);

            if (!illustrationGrouped[d.type]) {
              illustrationGrouped[d.type] = {
                qty: 0,
                photos: [],
              };
            }

            illustrationGrouped[d.type].qty += Number(d.qty || 0);

            const defectPhotos = d.photos || (d.photo ? [d.photo] : []);

            illustrationGrouped[d.type].photos = [
  ...illustrationGrouped[d.type].photos,
  ...defectPhotos,
].slice(0, 4);
          });

        }

      });
    });
  

  async function loadReports() {
  try {
    const { data, error } = await supabase.storage
      .from("reports")
      .list();

    console.log(data);

    if (error) {
      console.error(error);
      return;
    }

    setReports(data || []);
    setPage(8);

  } catch (err) {
    console.error(err);
  }
}

  function buildTableRows(grouped) {
    let totalCaisses = 0;
    let totalFruits = 0;
    let totalConforme = 0;
    let totalNonConforme = 0;

    let rows = Object.keys(grouped)
      .map((calibre) => {
        const g = grouped[calibre];

        totalCaisses += g.caisses;
        totalFruits += g.total;
        totalConforme += g.conforme;
        totalNonConforme += g.nonConforme;

        const tauxC =
          g.total > 0 ? ((g.conforme / g.total) * 100).toFixed(2) : 0;
        const tauxNC =
          g.total > 0 ? ((g.nonConforme / g.total) * 100).toFixed(2) : 0;

        return `
            <tr>
              <td>${calibre}</td>
              <td>${g.caisses}</td>
              <td>${tauxC}%</td>
              <td>${tauxNC}%</td>
            </tr>
          `;
      })
      .join("");

    const moyenneC =
      totalFruits > 0 ? ((totalConforme / totalFruits) * 100).toFixed(2) : 0;
    const moyenneNC =
      totalFruits > 0
        ? ((totalNonConforme / totalFruits) * 100).toFixed(2)
        : 0;

    rows += `
        <tr style="background:yellow;font-weight:bold">
          <td>Moyenne générale</td>
          <td>${totalCaisses}</td>
          <td>${moyenneC}%</td>
          <td>${moyenneNC}%</td>
        </tr>
      `;

    return rows;
  }

  const rowsPF = Object.keys(pfGrouped).length
    ? buildTableRows(pfGrouped)
    : `<tr><td colspan="4">Aucun contrôle produit fini</td></tr>`;

  const rowsEcart = Object.keys(ecartGrouped).length
    ? buildTableRows(ecartGrouped)
    : `<tr><td colspan="4">Aucun contrôle écarts</td></tr>`;

  const rowsDefects = Object.keys(defectGrouped)
    .map((type) => {
      const qty = defectGrouped[type];
      const percent =
        totalEcartNonConformeDay > 0
          ? ((qty / totalEcartNonConformeDay) * 100).toFixed(2)
          : 0;

      return `
          <tr>
            <td>${type}</td>
            <td>${qty}</td>
            <td>${percent}%</td>
          </tr>
        `;
    })
    .join("");
  Object.keys(recordsByLot).forEach((lotNumber, lotIndex) => {
    const lotRecords = recordsByLot[lotNumber];

    const lotPfGrouped = {};
    const lotEcartGrouped = {};
    const lotDefectGrouped = {};
    const lotIllustrationGrouped = {};

    let lotTotalEcartNonConforme = 0;
    let lotDate = "-";
    let lotCampagne = "-";
    let lotProducteur = "-";
    let lotFerme = "-";
    let lotVariete = "-";
    let lotControleurName = controleurName || "-";
    let lotControleId = controleId || "-";
    let lotSignature = signature || "-";
    lotRecords.forEach((r) => {
      if (r.date) lotDate = r.date;
      if (r.campagne) lotCampagne = r.campagne;
      if (r.producteur) lotProducteur = r.producteur;
      if (r.ferme) lotFerme = r.ferme;
      if (r.variete) lotVariete = r.variete;
      if (r.controleurName) lotControleurName = r.controleurName;
      if (r.controleId) lotControleId = r.controleId;
      if (r.signature) lotSignature = r.signature;
      if (r.type === "pf" && r.produit_fini_data) {
        const calibre = r.produit_fini_data.calibre || "Sans calibre";

        if (!lotPfGrouped[calibre]) {
          lotPfGrouped[calibre] = {
            caisses: 0,
            total: 0,
            conforme: 0,
            nonConforme: 0,
          };
        }

        lotPfGrouped[calibre].caisses += 1;
        lotPfGrouped[calibre].total += Number(r.produit_fini_data.total || 0);
        lotPfGrouped[calibre].conforme += Number(r.produit_fini_data.conforme || 0);
        lotPfGrouped[calibre].nonConforme += Number(r.produit_fini_data.nonConforme || 0);
      }

      if (r.type === "ecart" && r.ecarts_data) {
        const calibre = r.ecarts_data.calibre || "Sans calibre";

        if (!lotEcartGrouped[calibre]) {
          lotEcartGrouped[calibre] = {
            caisses: 0,
            total: 0,
            conforme: 0,
            nonConforme: 0,
          };
        }

        lotEcartGrouped[calibre].caisses += 1;
        lotEcartGrouped[calibre].total += Number(r.ecarts_data.total || 0);
        lotEcartGrouped[calibre].conforme += Number(r.ecarts_data.conforme || 0);
        lotEcartGrouped[calibre].nonConforme += Number(r.ecarts_data.nonConforme || 0);

        lotTotalEcartNonConforme += Number(r.ecarts_data.nonConforme || 0);

        (r.defects_list || []).forEach((d) => {
          if (!lotDefectGrouped[d.type]) lotDefectGrouped[d.type] = 0;
          lotDefectGrouped[d.type] += Number(d.qty || 0);

          if (!lotIllustrationGrouped[d.type]) {
            lotIllustrationGrouped[d.type] = {
              qty: 0,
              photos: [],
            };
          }

          lotIllustrationGrouped[d.type].qty += Number(d.qty || 0);

          const defectPhotos = d.photos || (d.photo ? [d.photo] : []);

          lotIllustrationGrouped[d.type].photos = [
            ...lotIllustrationGrouped[d.type].photos,
            ...defectPhotos,
          ].slice(0, 4);
        });
      }
    });

    const lotRowsPF = Object.keys(lotPfGrouped).length
      ? buildTableRows(lotPfGrouped)
      : `<tr><td colspan="4">Aucun contrôle produit fini</td></tr>`;

    const lotRowsEcart = Object.keys(lotEcartGrouped).length
      ? buildTableRows(lotEcartGrouped)
      : `<tr><td colspan="4">Aucun contrôle écarts</td></tr>`;

    const lotRowsDefects = Object.keys(lotDefectGrouped)
      .map((type) => {
        const qty = lotDefectGrouped[type];
        const percent =
          lotTotalEcartNonConforme > 0
            ? ((qty / lotTotalEcartNonConforme) * 100).toFixed(2)
            : 0;

        return `
        <tr>
          <td>${type}</td>
          <td>${qty}</td>
          <td>${percent}%</td>
        </tr>
      `;
      })
      .join("");

    let lotIllustrationRows = "";

    Object.keys(lotIllustrationGrouped).forEach((type) => {
      const item = lotIllustrationGrouped[type];

      const percent =
        lotTotalEcartNonConforme > 0
          ? ((item.qty / lotTotalEcartNonConforme) * 100).toFixed(2)
          : 0;
      if (showPhotosInPdf) {
        lotIllustrationRows += `
      <div style="margin-top:18px;border:1px solid #ccc;padding:12px;page-break-inside:avoid;">
        <h4 style="margin:0 0 8px 0">Type défaut : ${type}</h4>
        <p><b>Quantité totale :</b> ${item.qty}</p>
        <p><b>Pourcentage journalier :</b> ${percent}%</p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
          ${item.photos.length
            ? item.photos
              .map(
                (photo) => `
                      <img
                        src="${photo}"
                        style="width:160px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;"
                      />
                    `
              )
              .join("")
            : `<p>Aucune photo pour ce type</p>`
          }
        </div>
      </div>
       `;
      }
    });
    lotSections += `
    <div class="pdf-page" style="margin-top:25px; min-height:auto; page-break-after:auto;">
  <h2 style="text-align:center">
    Rapport de Contrôle Journalier de Conditionnement
  </h2>

  <div style="border:1px solid #ddd;padding:12px;margin:15px 0 25px 0;background:#f8fafc">
    <p><b>Observation générale :</b> ${observationFinale || "-"}</p>
    <p>
      <b>Décision finale :</b>
      <span style="font-weight:bold;color:${decision === "Non conforme"
        ? "#dc2626"
        : decision === "À vérifier"
          ? "#d97706"
          : "#16a34a"
      }">
        ${decision}
      </span>
    </p>
  </div>

      <div style="background:#f8fafc;border:1px solid #ddd;padding:15px;margin-bottom:20px">
<p><b>Date :</b> ${lotDate}</p>
  <p><b>Campagne :</b> ${lotCampagne}</p>
  <p><b>Numéro de lot :</b> ${lotNumber}</p>
  <p><b>Producteur :</b> ${lotProducteur}</p>
  <p><b>Ferme :</b> ${lotFerme}</p>
  <p><b>Variété :</b> ${lotVariete}</p>
  <p><b>Nom contrôleur :</b> ${lotControleurName}</p>
<p><b>ID de contrôle :</b> ${lotControleId}</p>
<p><b>Signature :</b> ${lotSignature}</p>
</div>
      <h3 style="background:#eee;padding:8px;text-align:center">Produit fini</h3>
      <table border="1" style="width:100%;border-collapse:collapse;text-align:center">
        <tr>
          <th>Calibre</th>
          <th>Nombre de caisses contrôlées</th>
          <th>Conforme</th>
          <th>Non conforme</th>
        </tr>
        ${lotRowsPF}
      </table>

      <h3 style="background:#d9ead3;padding:8px;text-align:center;margin-top:25px">Écarts</h3>
      <table border="1" style="width:100%;border-collapse:collapse;text-align:center">
        <tr>
          <th>Calibre</th>
          <th>Nombre de caisses contrôlées</th>
          <th>Conforme</th>
          <th>Non conforme</th>
        </tr>
        ${lotRowsEcart}
      </table>

      <h3 style="background:#d9ead3;padding:8px;text-align:center;margin-top:25px">Détail des défauts</h3>
      <table border="1" style="width:100%;border-collapse:collapse;text-align:center">
        <tr>
          <th>Type défaut</th>
          <th>Quantité totale</th>
          <th>Pourcentage journalier</th>
        </tr>
        ${lotRowsDefects || `<tr><td colspan="3">Aucun défaut</td></tr>`}
      </table>

      </div>

<div class="pdf-page" style="margin-top:25px;">
  <h2 style="background:#bbf7d0;padding:10px;text-align:center">
    Illustrations des défauts - Lot N° : ${lotNumber}
  </h2>

  ${lotIllustrationRows || `<p>Aucune illustration disponible</p>`}
  </div>
  `;
  });
  const report = document.createElement("div");
  report.style.width = "900px";
  report.style.padding = "25px";
  report.style.background = "white";
  report.style.fontFamily = "Arial";

  report.innerHTML = `
  <h2 style="text-align:center">
    Rapport de Contrôle Journalier de Conditionnement
  </h2>

  <div style="border:1px solid #ddd;padding:12px;margin:15px 0 25px 0;background:#f8fafc">
    <p><b>Observation générale :</b> ${observationFinale || "-"}</p>
    <p>
      <b>Décision finale :</b>
      <span style="font-weight:bold;color:${decision === "Non conforme"
      ? "#dc2626"
      : decision === "À vérifier"
        ? "#d97706"
        : "#16a34a"
    }">
        ${decision}
      </span>
    </p>
  </div>

  ${lotSections}
`;
  document.body.appendChild(report);

  await waitForImages(report);

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfPages = report.querySelectorAll(".pdf-page");

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  for (let i = 0; i < pdfPages.length; i++) {
    const pageEl = pdfPages[i];
window.scrollTo(0, 0);

const canvas = await html2canvas(pageEl, {
  scale: 1.5,
  useCORS: true,
  allowTaint: true,
});

    const imgData = canvas.toDataURL("image/png");

    let imgWidth = usableWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgWidth < pageWidth) {
      imgHeight = usableHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    if (i > 0) {
      pdf.addPage();
    }

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= usableHeight;
    }
  }
  const pdfBlob = pdf.output("blob");

  const fileName = `rapport_${dashboardDate}_${Date.now()}.pdf`;

  const { data: uploadData, error: uploadError } =
    await supabase.storage
      .from("reports")
      .upload(fileName, pdfBlob, {
        upsert: true,
      });

  if (uploadError) {
    console.error(uploadError);
  } else {
    console.log("PDF enregistré !");
  }

  pdf.save(`rapport_${dashboardDate}.pdf`);

  document.body.removeChild(report);
}
const citrusTheme = {
  darkGreen: "#24451F",
  leafGreen: "#6FA43A",
  softGreen: "#EEF7E8",
  veryLightGreen: "#F8FAF5",
  citrusOrange: "#F59E0B",
  citrusYellow: "#FACC15",
  textDark: "#2B2B2B",
  cardWhite: "#FFFFFF",
};
const titleStyle = {
  color: citrusTheme.darkGreen,
  fontSize: "36px",
  fontWeight: "900",
  textAlign: "center",
  marginBottom: "25px",
  letterSpacing: "-0.8px",
};

const pageStyle = {
  minHeight: "100vh",

  background: darkMode
    ? "#1e293b"
    : "linear-gradient(135deg, #F8FAF5 0%, #EEF7E8 45%, #FFF7E0 100%)",

  padding: "40px",

  color: darkMode
    ? "white"
    : citrusTheme.textDark,
};
const containerStyle = {
  maxWidth: "1050px",
  margin: "0 auto",
  background: darkMode
  ? "rgba(15,23,42,0.92)"
  : "rgba(255,255,255,0.65)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: "32px",
  padding: "30px",
  boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
  backdropFilter: "blur(10px)",
};
const labelStyle = {
  display: "block",
  color: citrusTheme.darkGreen,
  fontWeight: "800",
  fontSize: "15px",
  marginTop: "12px",
  marginBottom: "6px",
};
const inputStyle = {
  width: "100%",
  padding: "17px 20px",
  margin: "10px 0 22px",
  borderRadius: "18px",
  border: "1px solid #dbe3ec",
  background: "rgba(248,250,252,0.95)",
  fontSize: "16px",
  color: "#111827",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
};
const buttonStyle = {
  width: "100%",
  padding: "18px",
  border: "none",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #F59E0B, #FACC15)",
  color: "#2B2B2B",
  fontSize: "18px",
  fontWeight: "800",
  marginTop: "18px",
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(245,158,11,0.30)",
  transition: "all 0.2s ease",
};
const secondaryButtonStyle = {
  width: "100%",
  padding: "20px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.95)",
  marginTop: "18px",
  cursor: "pointer",
  fontSize: "18px",
  fontWeight: "700",
  color: "#111827",
  boxShadow: "0 14px 35px rgba(15,23,42,0.08)",
  transition: "all 0.2s ease",
};
const defectButtonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #F59E0B, #FACC15)",
  border: "none",
  marginTop: "15px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "900",
  color: "#2B2B2B",
  boxShadow: "0 12px 25px rgba(245,158,11,0.25)",
  transition: "all 0.2s ease",
};

const backButtonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "12px",
  background: "white",
  border: "1px solid #ddd",
  marginTop: "20px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#ef4444",
  color: "white",
  cursor: "pointer",
  marginLeft: "8px",
};

const editButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#3b82f6",
  color: "white",
  cursor: "pointer",
};

const editNoticeStyle = {
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: "bold",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "15px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0",
  marginTop: "24px",
  background: citrusTheme.cardWhite,
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: "0 14px 35px rgba(111,164,58,0.12)",
  border: "1px solid rgba(111,164,58,0.18)",
  pageBreakInside: "auto",
breakInside: "auto",
};

const thStyle = {
  borderBottom: "1px solid rgba(111,164,58,0.25)",
  padding: "14px",
  background: "linear-gradient(135deg, #24451F, #4E7F2D)",
  color: "white",
  fontWeight: "800",
  textAlign: "center",
  pageBreakInside: "avoid",
breakInside: "avoid",
};

const tdStyle = {
  borderBottom: "1px solid #e5e7eb",
  padding: "14px",
  textAlign: "center",
  color: citrusTheme.textDark,
  fontWeight: "600",
  pageBreakInside: "avoid",
breakInside: "avoid",
};

const toolbarStyle = {
  display: "flex",
  gap: "14px",
  marginBottom: "35px",
  padding: "16px",
  background: "linear-gradient(135deg, #24451F, #4E7F2D)",
  border: "1px solid rgba(111,164,58,0.35)",
  borderRadius: "24px",
  boxShadow: "0 18px 45px rgba(36,69,31,0.25)",
};
const toolbarButtonStyle = {
  width: "64px",
  height: "58px",
  borderRadius: "18px",
  border: "1px solid rgba(250,204,21,0.35)",
  background: "linear-gradient(135deg, #FFFFFF, #FFF7E0)",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
  transition: "all 0.2s ease",
};
const dashboardPageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f0fdf4, #eff6ff, #fff7ed)",
  padding: "40px",
};
const dashboardContainerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const dashboardTitleStyle = {
  fontSize: "46px",
  marginBottom: "12px",
  color: citrusTheme.darkGreen,
  fontWeight: "900",
  textAlign: "center",
  letterSpacing: "-1px",
};

const dashboardSubtitleStyle = {
  fontSize: "18px",
  color: "#6b7280",
  marginBottom: "30px",
};

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "25px",
  alignItems: "stretch",
};

const chartCardStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 18px 40px rgba(15,23,42,0.10)",
  border: "1px solid rgba(226,232,240,0.9)",
  minHeight: "420px",
  overflow: "hidden",
};

const chartTitleStyle = {
  fontSize: "24px",
  color: "#111827",
  marginBottom: "22px",
  textAlign: "center",
  fontWeight: "800",
  letterSpacing: "-0.5px",
};

const chartTextStyle = {
  color: "#6b7280",
  fontSize: "15px",
  marginBottom: "18px",
};
if (!isLoggedIn) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={{ textAlign: "center" }}>Connexion</h1>

        <label>Nom d'utilisateur</label>
        <input
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
          style={inputStyle}
          placeholder="Entrer le nom d'utilisateur"
        />

        <label>Mot de passe</label>
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          style={inputStyle}
          placeholder="Entrer le mot de passe"
        />

        <button style={buttonStyle} onClick={handleLogin}>
          Se connecter
        </button>
      </div>
    </div>
  );
}
if (page === 5) {
  console.log("PAGE 5 KHEDAMA");
  const filteredHistory = history.filter((record) => {
    const search = historySearch.toLowerCase().trim();

    if (!search) return true;

    const recordText = [
      record.date,
      record.dateKey,
      record.lot,
      record.campagne,
      record.variete,
      record.producteur,
      record.ferme,
      record.type === "pf" ? "Produit fini" : "Écarts",
      record.produit_fini_data?.calibre,
      record.ecarts?.calibre,
    ]
      .join(" ")
      .toLowerCase();

    return recordText.includes(search);
  });
  console.log("FILTERED HISTORY:", filteredHistory);
  const historyByDate = filteredHistory.reduce((acc, record) => {
    const dateKey =
      record.created_at
        ? new Date(record.created_at).toLocaleDateString()
        : "Sans date";
    const lotKey =
      String(record.lot_number || record.lot || "").trim() ||
      "Sans numéro de lot";

    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }

    if (!acc[dateKey][lotKey]) {
      acc[dateKey][lotKey] = {
        pf: [],
        ecart: [],
      };
    }

    if (record.type === "pf") {
      acc[dateKey][lotKey].pf.push(record);
    }

    if (record.type === "ecart") {
      acc[dateKey][lotKey].ecart.push(record);
    }

    return acc;
  }, {});
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={titleStyle}>Historique des contrôles</h1>
        <input
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Rechercher par date, lot, producteur, ferme, variété, calibre..."
          style={inputStyle}
        />

        <button style={buttonStyle} onClick={loadHistory}>
          Afficher les contrôles
        </button>

        <div style={{ marginTop: "25px" }}>
          {history.length === 0 ? (
            <p style={{ textAlign: "center", marginTop: "20px" }}>
              Aucun contrôle enregistré.
            </p>
          ) : (
            Object.keys(historyByDate).map((dateKey) => (
              <div
                key={dateKey}
                style={{
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "14px",
                  padding: "15px",
                  marginBottom: "18px",
                }}
              >
                <button
                  style={{
                    ...secondaryButtonStyle,
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                  onClick={() => {
                    setOpenDate(openDate === dateKey ? null : dateKey);
                    setOpenLot(null);
                  }}
                >
                  📅 Date : {dateKey}
                </button>

                {openDate === dateKey && (
                  <div
                    className="pdf-page"
                    style={{
                      marginTop: "25px",
                      width: "100%",
                      padding: "10px",
                    }}
                  >
                    {Object.keys(historyByDate[dateKey]).map((lotKey) => {
                      const lotData = historyByDate[dateKey][lotKey];
                      console.log("DATE KEY:", dateKey);
                      console.log("LOT KEY:", lotKey);
                      console.log("LOT DATA:", lotData);
                      const lotOpenKey = `${dateKey}-${lotKey}`;

                      return (
                        <div
                          key={lotKey}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "15px",
                            background: "#f9fafb",
                          }}
                        >
                          <div
                            onClick={() =>
                              setOpenLot(openLot === lotOpenKey ? null : lotOpenKey)
                            }
                            style={{
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "18px",
                              marginBottom: "10px",
                              color: "#111827",
                            }}
                          >
                            📦 Lot : {lotKey}
                          </div>

                          {openLot === lotOpenKey && (
                            <div style={{ marginTop: "15px" }}>
                              <h3 style={{ color: "#166534" }}>
                                Type contrôle : Produit fini
                              </h3>

                              {lotData.pf.length === 0 ? (
                                <p>Aucun contrôle produit fini.</p>
                              ) : (
                                lotData.pf.map((r, index) => (
                                  <div
                                    key={r.id || `pf-${index}`}
                                    style={{
                                      background: "white",
                                      border: "1px solid #ddd",
                                      borderRadius: "10px",
                                      padding: "12px",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    <p>
                                      <b>Contrôle :</b> Produit fini
                                    </p>
                                    <p>
                                      <b>Calibre :</b>{" "}
                                      {r.calibre || "-"}
                                    </p>



                                    <button
                                      style={editButtonStyle}
                                      onClick={() => editRecord(r)}
                                    >
                                      ✏️ Modifier
                                    </button>

                                    <button
                                      style={deleteButtonStyle}
                                      onClick={() => deleteRecord(r)}
                                    >
                                      🗑️ Supprimer
                                    </button>
                                  </div>
                                ))
                              )}

                              <h3 style={{ color: "#166534", marginTop: "20px" }}>
                                Type contrôle : Écarts
                              </h3>

                              {lotData.ecart.length === 0 ? (
                                <p>Aucun contrôle écarts.</p>
                              ) : (
                                lotData.ecart.map((r, index) => (
                                  <div
                                    key={r.id || `ecart-${index}`}
                                    style={{
                                      background: "white",
                                      border: "1px solid #ddd",
                                      borderRadius: "10px",
                                      padding: "12px",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    <p>
                                      <b>Contrôle :</b> Écarts
                                    </p>
                                    <p>
                                      <b>Calibre :</b> {r.calibre || "-"}
                                    </p>
                                    {r.defects_list && r.defects_list.length > 0 && (
                                      <>
                                        <div
                                          style={{
                                            marginTop: "10px",
                                            padding: "12px",
                                            background: "#fff7ed",
                                            borderRadius: "10px",
                                            border: "1px solid #fdba74",
                                          }}
                                        >
                                          <p style={{ margin: "4px 0", fontWeight: "bold" }}>
                                            📦 Total défauts :{" "}
                                            {r.defects_list.reduce(
                                              (sum, d) => sum + Number(d.qty || 0),
                                              0
                                            )}
                                          </p>

                                          <p style={{ margin: "4px 0", fontWeight: "bold" }}>
                                            ⚠️ Défaut dominant :{" "}
                                            {r.defects_list.sort(
                                              (a, b) => Number(b.qty || 0) - Number(a.qty || 0)
                                            )[0]?.type || "-"}
                                          </p>

                                          <p style={{ margin: "4px 0", fontWeight: "bold" }}>
                                            🚨 Risque :{" "}
                                            {r.defects_list.reduce(
                                              (sum, d) => sum + Number(d.qty || 0),
                                              0
                                            ) >= 10
                                              ? "Élevé"
                                              : "Faible"}
                                          </p>
                                        </div>

                                        <div
                                          style={{
                                            marginTop: "12px",
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "8px",
                                            justifyContent: "center",
                                          }}
                                        >
                                          {r.defects_list.map((defaut, i) => (
                                            <span
                                              key={i}
                                              style={{
                                                background: "#fef3c7",
                                                color: "#92400e",
                                                padding: "6px 12px",
                                                borderRadius: "999px",
                                                fontWeight: "bold",
                                                fontSize: "14px",
                                              }}
                                            >
                                              {defaut.type} : {defaut.qty}
                                            </span>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    <button
                                      style={editButtonStyle}
                                      onClick={() => editRecord(r)}
                                    >
                                      ✏️ Modifier
                                    </button>

                                    <button
                                      style={deleteButtonStyle}
                                      onClick={() => deleteRecord(r)}
                                    >
                                      🗑️ Supprimer
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )
          }
        </div>

        <button style={backButtonStyle} onClick={() => setPage(2)}>
          ⬅ Retour menu
        </button>
      </div>
    </div>
  );
}
if (page === 8) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <Toolbar
          newLot={newLot}
          setPage={setPage}
        loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={titleStyle}>Rapports enregistrés</h1>

        {reports.length === 0 ? (
          <p>Aucun rapport trouvé.</p>
        ) : (
          reports.map((file, index) => {
            const { data } = supabase.storage
              .from("reports")
              .getPublicUrl(file.name);

            return (
              <div
                key={index}
                style={{
                  background: "white",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <p>
                  📅 <b>{file.name.replace(".pdf", "")}</b>
                </p>

                <a
                  href={data.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#2563eb",
                    fontWeight: "bold",
                  }}
                >
                  ⬇️ Télécharger / Ouvrir
                </a>
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
if (page === 7) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={titleStyle}>Paramètres qualité</h1>

        <label style={labelStyle}>Seuil Conforme jusqu’à (%)</label>
        <input
          type="text"
          inputMode="numeric"
          value={seuilConforme}
          onChange={(e) => setSeuilConforme(onlyNumbers(e.target.value))}
          style={inputStyle}
        />

        <label style={labelStyle}>Seuil À vérifier jusqu’à (%)</label>
        <input
          type="text"
          inputMode="numeric"
          value={seuilVerifier}
          onChange={(e) => setSeuilVerifier(onlyNumbers(e.target.value))}
          style={inputStyle}
        />

        <label style={labelStyle}>Nombre maximum de photos par défaut</label>
        <input
          type="text"
          inputMode="numeric"
          value={maxPhotos}
          onChange={(e) => setMaxPhotos(onlyNumbers(e.target.value))}
          style={inputStyle}
        />

        <label style={labelStyle}>Campagne par défaut</label>
        <input
          value={campagneDefault}
          onChange={(e) => setCampagneDefault(e.target.value)}
          style={inputStyle}
        />
        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <label style={{ ...labelStyle, margin: 0 }}>
              Afficher les photos dans le PDF
            </label>

            <input
              type="checkbox"
              checked={showPhotosInPdf}
              onChange={(e) => setShowPhotosInPdf(e.target.checked)}
              style={{
                width: "22px",
                height: "22px",
                cursor: "pointer",
              }}
            />
          </div>
          <label style={labelStyle}>
  Mode sombre
</label>

<input
  type="checkbox"
  checked={darkMode}
  onChange={(e) => setDarkMode(e.target.checked)}
  style={{
    width: "22px",
    height: "22px",
    marginBottom: "20px",
  }}
/>
          <label style={labelStyle}>Qualité du PDF</label>

          <select
            value={pdfQuality}
            onChange={(e) => setPdfQuality(e.target.value)}
            style={inputStyle}
          >
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>

        </div>
{saveMessage && (
  <div
    style={{
      background: "#16a34a",
      color: "white",
      padding: "12px",
      borderRadius: "12px",
      marginBottom: "15px",
      textAlign: "center",
      fontWeight: "bold",
    }}
  >
    {saveMessage}
  </div>
)}
        <button style={buttonStyle} onClick={saveParametresQualite}>
          💾 Enregistrer les paramètres
        </button>

        <button style={backButtonStyle} onClick={() => setPage(2)}>
          ⬅ Retour menu
        </button>
      </div>
    </div>
  );
}
if (page === 6) {
  const recordsToday = history.filter((r) => {
    const recordDate = new Date(r.created_at);

    const selectedDate = new Date(dashboardDate);

    if (dashboardPeriod === "day") {
      return (
        recordDate.toISOString().split("T")[0] ===
        selectedDate.toISOString().split("T")[0]
      );
    }


    if (dashboardPeriod === "week") {
      const currentDate = new Date(selectedDate);

      const firstDay = new Date(currentDate);
      firstDay.setDate(currentDate.getDate() - 7);

      return (
        recordDate >= firstDay &&
        recordDate <= currentDate
      );
    }
    if (dashboardPeriod === "month") {
      return (
        recordDate.getMonth() === selectedDate.getMonth() &&
        recordDate.getFullYear() === selectedDate.getFullYear()
      );
    }

    return true;
  });

  const dashboardLotOptions = [
    "Tous",
    ...new Set(
      recordsToday.map(
        (r) => r.lot_number || r.lot || "Sans numéro de lot"
      )
    ),
  ];



  // 📈 1: % déchets Produit Fini avec le temps
  const pfTimeData = recordsToday
    .filter((r) => r.type === "pf")
    .map((r) => {
      const total = Number(r.produit_fini_data?.total || 0);

      const conforme = Number(r.produit_fini_data?.conforme || 0);

      const nonConforme = total - conforme;

      return {
        time: new Date(r.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),

        taux:
          total > 0
            ? Number(((nonConforme / total) * 100).toFixed(2))
            : 0,
      };
    });

  // 📈 2: % fruits conformes Écarts مع الوقت
  const ecartConformeTimeData = recordsToday
    .filter((r) => r.ecarts_data)
    .map((r) => {
      const total = Number(r.ecarts_data?.total || 0);
      const conforme = Number(r.ecarts_data?.conforme || 0);

      return {
        time: new Date(r.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),

        taux:
          total > 0
            ? Number(((conforme / total) * 100).toFixed(2))
            : 0,
      };
    });
  // 🥇 3: Pourcentage des défauts
  let totalDefauts = 0;
  const defectCount = {};

  recordsToday.forEach((r) => {
    if (r.type === "ecart" && r.ecarts_data) {
      r.defects_list.forEach((d) => {
        if (!defectCount[d.type]) defectCount[d.type] = 0;
        defectCount[d.type] += Number(d.qty || 0);
        totalDefauts += Number(d.qty || 0);
      });
    }
  });

  const COLORS_DEFECTS = [
    "#6FA43A",
    "#F59E0B",
    "#FACC15",
    "#4E7F2D",
    "#A3C76D",
    "#F97316",
    "#D9A441",
    "#2F5D2F",
  ];

  const defectData = Object.keys(defectCount).map((type) => ({
    name: type,
    pourcentage:
      totalDefauts > 0
        ? Number(((defectCount[type] / totalDefauts) * 100).toFixed(2))
        : 0,
  }));

  // ⚖️ 4: Conforme vs Non conforme (%)
  let conforme = 0;
  let nonConforme = 0;

  recordsToday.forEach((r) => {
    if (r.type === "pf") {
      conforme += Number(r.produit_fini_data?.conforme || 0);
      nonConforme += Number(r.produit_fini_data?.nonConforme || 0);
    }
  });

  const totalPF = conforme + nonConforme;
  console.log(JSON.stringify(recordsToday, null, 2));

  const defectStats = {};

  recordsToday.forEach((record) => {
    if (record.defects_list && Array.isArray(record.defects_list)) {

      record.defects_list.forEach((defaut) => {
        const nomDefaut =
          typeof defaut === "object"
            ? defaut.nom ||
            defaut.name ||
            defaut.defaut ||
            defaut.type ||
            "Défaut inconnu"
            : defaut;
        defectStats[nomDefaut] =
          (defectStats[nomDefaut] || 0) + 1;

      });

    }
  });

  const totalDefects = Object.values(defectStats).reduce(
    (sum, count) => sum + count,
    0
  );

  const topDefects = Object.entries(defectStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage:
        totalDefects > 0
          ? ((count / totalDefects) * 100).toFixed(0)
          : 0,
    }));
  recordsToday.forEach((record) => {
    if (record.defects_list && Array.isArray(record.defects_list)) {

      record.defects_list.forEach((defaut) => {
        const nomDefaut =
          typeof defaut === "object"
            ? defaut.name || defaut.defaut || "Défaut inconnu"
            : defaut;

        defectStats[nomDefaut] =
          (defectStats[nomDefaut] || 0) + 1;
      });

    }
  });
  const hourlyData = {};

  recordsToday.forEach((record) => {
    const date = new Date(record.created_at);

    const hour =
      String(date.getHours()).padStart(2, "0") + ":00";

    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        total: 0,
        nonConforme: 0,
      };
    }

    hourlyData[hour].total +=
      Number(record.produit_fini_data?.total || 0);

    hourlyData[hour].nonConforme +=
      Number(record.produit_fini_data?.nonConforme || 0);
  });

  const evolutionHoraire = Object.entries(hourlyData).map(
    ([hour, values]) => ({
      heure: hour,
      taux:
        values.total > 0
          ? Number(
            (
              (values.nonConforme / values.total) *
              100
            ).toFixed(2)
          )
          : 0,
    })
  );

  const pieData = [
    {
      name: "Conforme",
      value: totalPF > 0 ? Number(((conforme / totalPF) * 100).toFixed(2)) : 0,
    },
    {
      name: "Non conforme",
      value: totalPF > 0 ? Number(((nonConforme / totalPF) * 100).toFixed(2)) : 0,
    },
  ];
  const totalLotsDashboard = new Set(
    recordsToday.map(
      (r) => r.lot_number || r.lot || "Sans numéro de lot"
    )
  ).size;

  const totalControlesDashboard = recordsToday.length;

  const totalFruitsPF = recordsToday
    .filter((r) => r.type === "pf")
    .reduce((sum, r) => sum + Number(r.produit_fini_data?.total || 0), 0);

  const totalNonConformePF = recordsToday
    .filter((r) => r.type === "pf")
    .reduce(
      (sum, r) =>
        sum +
        (
          Number(r.produit_fini_data?.total || 0) -
          Number(r.produit_fini_data?.conforme || 0)
        ),
      0
    );
  const totalFruitsEcart = recordsToday
    .filter((r) => r.ecarts_data)
    .reduce((sum, r) => sum + Number(r.ecarts?.total || 0), 0);

  const totalNonConformeEcart = recordsToday
    .filter((r) => r.ecarts_data)
    .reduce((sum, r) => sum + Number(r.ecarts?.nonConforme || 0), 0);

  const totalFruitsGlobal = totalFruitsPF + totalFruitsEcart;
  const totalNonConformeGlobal = totalNonConformePF + totalNonConformeEcart;

  const tauxNonConformeGlobal =
    totalFruitsGlobal > 0
      ? Number(((totalNonConformeGlobal / totalFruitsGlobal) * 100).toFixed(2))
      : 0;

  const defautPrincipal =
    defectData.length > 0
      ? defectData.reduce((max, item) =>
        item.pourcentage > max.pourcentage ? item : max
      ).name
      : "Aucun défaut";
  const PIE_COLORS = ["#22c55e", "#ef4444"];

  return (
    <div style={dashboardPageStyle}>
      <div style={dashboardContainerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={dashboardTitleStyle}>📊 Tableau de bord qualité</h1>
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "18px",
            margin: "20px 0",
            border: "1px solid rgba(111,164,58,0.18)",
            boxShadow: "0 12px 30px rgba(111,164,58,0.10)",
          }}
        >
          <label style={labelStyle}>Choisir la date du tableau de bord</label>

          <input
            type="date"
            value={dashboardDate}
            onChange={(e) => {
              setDashboardDate(e.target.value);
              setDashboardLot("Tous");
            }}
            style={inputStyle}
          />
          <label style={labelStyle}>Période</label>

          <select
            value={dashboardPeriod}
            onChange={(e) => setDashboardPeriod(e.target.value)}
            style={inputStyle}
          >
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
          <label style={labelStyle}>Filtrer par lot</label>
          <select
            value={dashboardLot}
            onChange={(e) => setDashboardLot(e.target.value)}
            style={inputStyle}
          >
            {dashboardLotOptions.map((lotOption) => (
              <option key={lotOption} value={lotOption}>
                {lotOption === "Tous" ? "Tous les lots" : `Lot ${lotOption}`}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "18px",
            margin: "25px 0",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280", margin: 0 }}>Lots contrôlés</p>
            <h2 style={{ fontSize: "36px", margin: "10px 0" }}>
              {totalLotsDashboard}
            </h2>
            <p style={{ color: "#16a34a", fontWeight: "bold" }}>Aujourd’hui</p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280", margin: 0 }}>Contrôles réalisés</p>
            <h2 style={{ fontSize: "36px", margin: "10px 0" }}>
              {totalControlesDashboard}
            </h2>
            <p style={{ color: "#2563eb", fontWeight: "bold" }}>
              PF + Écarts
            </p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280", margin: 0 }}>
              Taux non conforme global
            </p>
            <h2 style={{ fontSize: "36px", margin: "10px 0" }}>
              {tauxNonConformeGlobal}%
            </h2>
            <p
              style={{
                color:
                  tauxNonConformeGlobal > 10
                    ? "#dc2626"
                    : tauxNonConformeGlobal > 5
                      ? "#d97706"
                      : "#16a34a",
                fontWeight: "bold",
              }}
            >
              {tauxNonConformeGlobal > 10
                ? "Élevé"
                : tauxNonConformeGlobal > 5
                  ? "Moyen"
                  : "Faible"}
            </p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280", margin: 0 }}>Défaut principal</p>
            <h2 style={{ fontSize: "28px", margin: "10px 0" }}>
              {defautPrincipal}
            </h2>
            <p style={{ color: "#7c3aed", fontWeight: "bold" }}>
              Défaut dominant
            </p>
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "22px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            minWidth: "260px",
          }}
        >
          <p
            style={{
              color: "#6b7280",
              marginBottom: "15px",
              fontWeight: "bold",
            }}
          >
            Top 5 défauts
          </p>
          {topDefects.length === 0 ? (
            <p>Aucun défaut</p>
          ) : (
            topDefects.map((defect, index) => {
              let color = "#16a34a";

              if (defect.percentage >= 35) {
                color = "#dc2626";
              } else if (defect.percentage >= 20) {
                color = "#f97316";
              }

              return (
                <div
                  key={index}
                  style={{
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      fontWeight: "bold",
                      fontSize: "17px",
                    }}
                  >
                    <span style={{ color }}>
                      {defect.name}
                    </span>

                    <span style={{ color }}>
                      {defect.percentage}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "16px",
                      background: "#e5e7eb",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${defect.percentage}%`,
                        height: "100%",
                        background: color,
                        borderRadius: "999px",
                        transition: "0.4s",
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
          <div style={dashboardGridStyle}></div>
          {/* 📈 PF */}
          <div style={chartCardStyle}>
            <h2 style={chartTitleStyle}>📉 % déchets Produit Fini</h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pfTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="taux"
                  stroke="#ef4444"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 📈 Écarts */}
          <div style={chartCardStyle}>
            <h2 style={chartTitleStyle}>📈 % fruits conformes Écarts</h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ecartConformeTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="taux"
                  stroke="#22c55e"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 🥇 défauts */}
          <div style={chartCardStyle}>
            <h2 style={chartTitleStyle}>🥇 Pourcentage des défauts</h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectData}>
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  height={90}
                  interval={0}
                />
                <YAxis tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="pourcentage">
                  {defectData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS_DEFECTS[index % COLORS_DEFECTS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ⚖️ Pie */}
          <div style={chartCardStyle}>
            <h2 style={chartTitleStyle}>⚖️ Conforme vs Non conforme</h2>

            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  outerRadius={110}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={chartCardStyle}>
            <h2 style={chartTitleStyle}>
              📈 Evolution par heure
            </h2>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={evolutionHoraire}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="heure" />

                <YAxis domain={[0, 100]} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="taux"
                  stroke="#2563eb"
                  strokeWidth={3}
                  name="% Non conforme"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <button style={backButtonStyle} onClick={() => setPage(2)}>
          ⬅ Retour
        </button>
      </div>
    </div>
  );
}
if (page === 4) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={titleStyle}>Contrôle des Écarts</h1>

        {editIndex !== null && editType === "ecart" && (
          <p style={editNoticeStyle}>Mode modification ✏️</p>
        )}

        <label style={labelStyle}>Matricule contrôleur</label>
        <input style={inputStyle} />

        <label style={labelStyle}>Calibre</label>

        <input
          value={ecartCalibre}
          onChange={(e) => setEcartCalibre(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Nombre total des fruits</label>
        <input

          type="text"
          inputMode="numeric"
          value={ecartTotal}
          onChange={(e) => setEcartTotal(onlyNumbers(e.target.value))}
          onFocus={() => clearZero(ecartTotal, setEcartTotal)}
          onBlur={() => restoreZero(ecartTotal, setEcartTotal)}
          style={inputStyle}
        />

        <label style={labelStyle}>Nombre fruits conformes</label>
        <input
          type="text"
          inputMode="numeric"
          value={ecartConforme}
          onChange={(e) => setEcartConforme(onlyNumbers(e.target.value))}
          onFocus={() => clearZero(ecartConforme, setEcartConforme)}
          onBlur={() => restoreZero(ecartConforme, setEcartConforme)}
          style={inputStyle}
        />

        <button
          style={buttonStyle}
          onClick={() => {
            setShowEcartTable(true);
            appliquerAlerteAutomatique(ecartTauxNonConforme);
          }}
        >
          Valider calcul
        </button>
        {showEcartTable && (
          <>
            <ResultTable
              conforme={ecartConforme}
              nonConforme={ecartNonConforme}
              tauxConforme={ecartTauxConforme}
              tauxNonConforme={ecartTauxNonConforme}
            />

            <h2 style={titleStyle}>Détail des défauts</h2>

            {defects.map((defect, index) => (
              <div key={index}>
                <h3 style={{ color: citrusTheme.darkGreen }}>
                  Défaut {index + 1}
                </h3>

                <div style={gridStyle}>
                  <label style={labelStyle}>Type défaut</label>
                  <input
                    list={`defect-options-${index}`}
                    value={defect.type}
                    onChange={(e) => updateDefect(index, "type", e.target.value)}
                    placeholder="Écrire ou choisir un défaut"
                    style={inputStyle}
                  />

                  <datalist id={`defect-options-${index}`}>
                    {defectOptions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <label style={labelStyle}>Quantité</label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={defect.qty}
                    onChange={(e) =>
                      updateDefect(index, "qty", onlyNumbers(e.target.value))
                    }
                    style={inputStyle}
                  />

                  <button
                    style={secondaryButtonStyle}
                    onClick={() => openCamera(index)}
                  >
                    📷 Photo
                  </button>

                  {defect.photos && defect.photos.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "10px",
                      }}
                    >
                      {defect.photos.map((photo, photoIndex) => (
                        <div key={photoIndex} style={{ textAlign: "center" }}>
                          <img
                            src={photo}
                            alt="defaut"
                            style={{
                              width: "120px",
                              height: "90px",
                              objectFit: "cover",
                              borderRadius: "10px",
                              border: "1px solid #ddd",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => deletePhotoFromDefect(index, photoIndex)}
                            style={{
                              marginTop: "5px",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#ef4444",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {cameraOpen && photoDefectIndex === index && (
                    <div style={{ marginTop: "20px" }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: "100%", borderRadius: "10px" }}
                      />

                      <canvas ref={canvasRef} style={{ display: "none" }} />

                      <button style={buttonStyle} onClick={capturePhoto}>
                        📸 Capturer
                      </button>

                      <button style={backButtonStyle} onClick={closeCamera}>
                        ❌ Annuler
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}

            <button style={defectButtonStyle} onClick={addDefectRow}>
              + Ajouter défaut
            </button>

            <h2>Tableau des défauts</h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Type défaut</th>
                  <th style={thStyle}>Quantité</th>
                  <th style={thStyle}>Pourcentage</th>
                </tr>
              </thead>
              <tbody>
                {defects
                  .filter((d) => d.type && Number(d.qty) > 0)
                  .map((d, index) => (
                    <tr
  key={index}
  style={{
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
                      <td style={tdStyle}>{d.type}</td>
                      <td style={tdStyle}>{d.qty}</td>
                      <td style={tdStyle}>
                        {ecartNonConforme > 0
                          ? ((Number(d.qty) / ecartNonConforme) * 100).toFixed(2)
                          : 0}
                        %
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <button style={buttonStyle} onClick={() => saveLotData("ecart")}>
              {editIndex !== null && editType === "ecart"
                ? "💾 Enregistrer modification"
                : "💾 Enregistrer contrôle Écarts"}
            </button>

            <button style={backButtonStyle} onClick={() => setPage(2)}>
              ⬅ Retour menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}

if (page === 3) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />

        <h1 style={titleStyle}>Contrôle Produit Fini</h1>

        {editIndex !== null && editType === "pf" && (
          <p style={editNoticeStyle}>Mode modification ✏️</p>
        )}

        <label style={labelStyle}>Matricule contrôleur</label>
        <input style={inputStyle} />

        <label style={labelStyle}>Calibre</label>
        <input
          value={pfCalibre}
          onChange={(e) => setPfCalibre(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Nombre total des fruits</label>

        <input
          type="text"
          inputMode="numeric"
          value={pfTotal}
          onChange={(e) => setPfTotal(onlyNumbers(e.target.value))}
          onFocus={() => clearZero(pfTotal, setPfTotal)}
          onBlur={() => restoreZero(pfTotal, setPfTotal)}
          style={inputStyle}
        />

        <label style={labelStyle}>Nombre fruits non conformes</label>
        <input
          type="text"
          inputMode="numeric"
          value={pfNonConforme}
          onChange={(e) => setPfNonConforme(onlyNumbers(e.target.value))}
          onFocus={() => clearZero(pfNonConforme, setPfNonConforme)}
          onBlur={() => restoreZero(pfNonConforme, setPfNonConforme)}
          style={inputStyle}
        />

        <button style={buttonStyle} onClick={() => setShowPfTable(true)}>
          Valider
        </button>

        {showPfTable && (
          <>
            <ResultTable
              conforme={pfConforme}
              nonConforme={pfNonConforme}
              tauxConforme={pfTauxConforme}
              tauxNonConforme={pfTauxNonConforme}
            />

            <button style={buttonStyle} onClick={() => saveLotData("pf")}>
              {editIndex !== null && editType === "pf"
                ? "💾 Enregistrer modification"
                : "💾 Enregistrer contrôle Produit Fini"}
            </button>

            <button style={backButtonStyle} onClick={() => setPage(2)}>
              ⬅ Retour menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}

if (page === 2) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Toolbar
          newLot={newLot}
          setPage={setPage}
          loadReports={() => loadReports()}
          generateDailyReport={generateDailyReport}
          openHistory={openHistory}
          handleLogout={handleLogout}
          exportBackup={exportBackup}
          importBackup={importBackup}
          exportExcel={exportExcel}
        />


        <h1 style={titleStyle}>Menu de contrôle</h1>

        <div
          style={{
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "14px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <label style={labelStyle}>Nom contrôleur</label>
          <input
            value={controleurName}
            onChange={(e) => setControleurName(e.target.value)}
            placeholder="Entrer le nom du contrôleur"
            style={inputStyle}
          />

          <label style={labelStyle}>ID de contrôle</label>
          <input
            value={controleId}
            onChange={(e) => setControleId(e.target.value)}
            placeholder="Entrer l'ID de contrôle"
            style={inputStyle}
          />

          <label style={labelStyle}>Signature</label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Signature du contrôleur"
            style={inputStyle}
          />
          <label style={labelStyle}>Observation générale</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Écrire une observation générale..."
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
            }}
          />
          <label style={labelStyle}>Décision finale</label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            style={inputStyle}
          >
            <option value="Conforme">Conforme</option>
            <option value="Non conforme">Non conforme</option>
            <option value="À vérifier">À vérifier</option>
          </select>
        </div>

        <button style={secondaryButtonStyle} onClick={() => setPage(3)}>
          Contrôle Produit Fini
        </button>

        <button style={secondaryButtonStyle} onClick={() => setPage(4)}>
          Contrôle des Écarts
        </button>
      </div>
    </div>
  );
}

return (
  <div style={pageStyle}>
    <div style={containerStyle}>
      <h1>Identification du lot</h1>

      <label style={labelStyle}>Campagne</label>
      <input
        value={lot.campagne}
        onChange={(e) => updateLot("campagne", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Date automatique</label>
      <input
        value={lot.date}
        onChange={(e) =>
          setLot({
            ...lot,
            date: e.target.value,
          })
        }
        style={inputStyle}
      />

      <label style={labelStyle}>Numéro de lot</label>
      <input
        value={lot.numero}
        onChange={(e) =>
          setLot({
            ...lot,
            numero: e.target.value,
          })
        }
        style={inputStyle}
      />

      <label style={labelStyle}>Variété</label>
      <input
        value={lot.variete}
        onChange={(e) => updateLot("variete", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Producteur</label>
      <input
        value={lot.producteur}
        onChange={(e) => updateLot("producteur", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Ferme</label>
      <input
        value={lot.ferme}
        onChange={(e) => updateLot("ferme", e.target.value)}
        style={inputStyle}
      />

      <button style={buttonStyle} onClick={() => setPage(2)}>
        Valider
      </button>
    </div>
  </div>
);

function ResultTable({ conforme, nonConforme, tauxConforme, tauxNonConforme }) {
  return (
    <table
  style={{
    ...tableStyle,
    pageBreakInside: "avoid",
    breakInside: "avoid",
  }}
>
      <thead>
        <tr>
          <th style={thStyle}>Nombre fruits conformes</th>
          <th style={thStyle}>Nombre fruits non conformes</th>
          <th style={thStyle}>Taux conforme</th>
          <th style={thStyle}>Taux non conforme</th>
          
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={tdStyle}>{conforme}</td>
          <td style={tdStyle}>{nonConforme}</td>
          <td style={tdStyle}>{tauxConforme}%</td>
          <td style={tdStyle}>{tauxNonConforme}%</td>
        </tr>
      </tbody>
    </table>
  );
}
}
export default App;
