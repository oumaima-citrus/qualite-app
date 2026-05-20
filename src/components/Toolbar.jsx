const toolbarStyle = {};

const toolbarButtonStyle = {};

export default function Toolbar({
  newLot,
  loadReports,
  setPage,
  generateDailyReport,
  openHistory,
  handleLogout,
  exportBackup,
  importBackup,
  exportExcel,
}) {
  return (
    <div style={toolbarStyle}>

      <button title="Nouveau lot" style={toolbarButtonStyle} onClick={newLot}>
        ➕
      </button>

      <button title="Historique" style={toolbarButtonStyle} onClick={openHistory}>
        🔍
      </button>

      <button title="Dashboard" style={toolbarButtonStyle} onClick={() => setPage(6)}>
        📊
      </button>

      <button
        title="Paramètres qualité"
        style={toolbarButtonStyle}
        onClick={() => setPage(7)}
      >
        ⚙️
      </button>

      <button
        title="Menu de contrôle"
        style={toolbarButtonStyle}
        onClick={() => setPage(2)}
      >
        ↩️
      </button>

      {/* PDF اليوم */}
      <button
        title="Exporter PDF"
        style={toolbarButtonStyle}
        onClick={generateDailyReport}
      >
        📄
      </button>

    <button
  title="Afficher rapports"
  style={toolbarButtonStyle}
  onClick={loadReports}
>
  📂
</button>

      <button title="Imprimer" style={toolbarButtonStyle} onClick={() => window.print()}>
        🖨️
      </button>

      <button title="Backup JSON" style={toolbarButtonStyle} onClick={exportBackup}>
        💾
      </button>

      <label title="Importer backup" style={toolbarButtonStyle}>
        📁
        <input
          type="file"
          accept="application/json"
          onChange={importBackup}
          style={{ display: "none" }}
        />
      </label>

      <button title="Exporter Excel" style={toolbarButtonStyle} onClick={exportExcel}>
        📗
      </button>

      <button title="Déconnexion" style={toolbarButtonStyle} onClick={handleLogout}>
        🚪
      </button>

    </div>
  );
}