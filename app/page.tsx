"use client";
import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell, AreaChart, Area } from 'recharts';
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import * as XLSX from 'xlsx';

const DAFTAR_WILAYAH_JABAR = [
  "Kabupaten Bogor", "Kabupaten Sukabumi", "Kabupaten Cianjur", "Kabupaten Bandung",
  "Kabupaten Garut", "Kabupaten Tasikmalaya", "Kabupaten Ciamis", "Kabupaten Kuningan",
  "Kabupaten Cirebon", "Kabupaten Majalengka", "Kabupaten Sumedang", "Kabupaten Indramayu",
  "Kabupaten Subang", "Kabupaten Purwakarta", "Kabupaten Karawang", "Kabupaten Bekasi",
  "Kabupaten Bandung Barat", "Kabupaten Pangandaran", "Kota Bogor", "Kota Sukabumi",
  "Kota Bandung", "Kota Cirebon", "Kota Bekasi", "Kota Depok", "Kota Cimahi",
  "Kota Tasikmalaya", "Kota Banjar"
];

const ICONS = {
  Dashboard: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Predict: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Batch: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Alert: (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [wilayah, setWilayah] = useState("");
  const [searchWilayah, setSearchWilayah] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState<{ [key: string]: string }>({
    puskesmas: "", giziKurangLalu: "", airMinumLalu: "", sanitasiLalu: "", kemiskinanLalu: "", stuntingLalu: ""
  });
  
  const [hasilManual, setHasilManual] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hasilBatch, setHasilBatch] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [riwayatPrediksi, setRiwayatPrediksi] = useState<any[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  const filteredWilayah = useMemo(() => {
    return DAFTAR_WILAYAH_JABAR.filter(w => w.toLowerCase().includes(searchWilayah.toLowerCase()));
  }, [searchWilayah]);

  const fetchRiwayatDariFirebase = async () => {
    setIsLoadingDB(true);
    setError(null);
    try {
      const q = query(collection(db, "riwayat_prediksi"), orderBy("tanggal", "desc"), limit(20));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setRiwayatPrediksi(data.reverse()); 
    } catch (err: any) {
      console.error("Firebase error:", err);
      setError("Gagal memuat data. Mohon matikan Ad-Blocker atau periksa koneksi internet Anda.");
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => {
    fetchRiwayatDariFirebase();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const regex = /^[0-9.,]*$/;
    if (value === '' || regex.test(value)) setFormData({ ...formData, [name]: value });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!value) return;
    const decimalFields = ["airMinumLalu", "sanitasiLalu"];
    if (decimalFields.includes(name)) {
      let mathValue = parseFloat(value.replace(/\./g, '').replace(/,/g, '.'));
      if (isNaN(mathValue)) return;
      setFormData({ ...formData, [name]: mathValue.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) });
    } else {
      let mathValue = parseInt(value.replace(/\./g, '').replace(/,/g, ''), 10);
      if (isNaN(mathValue)) return;
      setFormData({ ...formData, [name]: mathValue.toLocaleString('id-ID') });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wilayah) return setError("Silakan pilih wilayah terlebih dahulu!");
    setLoading(true); setHasilManual(null); setError(null);
    try {
      const cleanedData: any = {};
      for (const key in formData) {
        let val = (formData as any)[key].replace(/\./g, '').replace(/,/g, '.');
        cleanedData[key] = parseFloat(val) || 0;
      }
      const response = await fetch("/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });
      const data = await response.json();
      if (data.status === "success") {
        const lastStunting = cleanedData.stuntingLalu;
        const diff = data.prediksi - lastStunting;
        setHasilManual({ prediction: data.prediksi, lastStunting: lastStunting, diff: diff });
        try {
          await addDoc(collection(db, "riwayat_prediksi"), {
            wilayah: wilayah, prediksi_baru: data.prediksi, stunting_lalu: lastStunting, selisih: diff, tanggal: new Date()
          });
          fetchRiwayatDariFirebase(); 
        } catch (dbErr) { console.error("Database error", dbErr); }
      } else setError(data.error);
    } catch (err: any) { setError("Gagal terhubung ke server AI."); } finally { setLoading(false); }
  };

  const submitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Silakan unggah dataset terlebih dahulu!");
    setLoading(true); setHasilBatch([]); setError(null);
    const formExcelData = new FormData();
    formExcelData.append("file", file);
    try {
      const response = await fetch("/api/predict-batch", { method: "POST", body: formExcelData });
      const data = await response.json();
      if (data.status === "success") setHasilBatch(data.hasil_batch);
      else setError(data.error);
    } catch (err) { setError("Gagal memproses analisis massal."); } finally { setLoading(false); }
  };

  const chartDataBatch = useMemo(() => {
    if (hasilBatch.length === 0) return [];
    return [...hasilBatch].sort((a, b) => b.prediksi - a.prediksi).slice(0, 10).map(item => ({
      name: item.wilayah,
      "Tahun Lalu": item.stunting_lalu,
      "Prediksi": item.prediksi,
      diff: item.selisih
    }));
  }, [hasilBatch]);

  const downloadExcel = (data: any[], filename: string = "data-prediksi.xlsx") => {
    if (!data || data.length === 0) return;
    const exportData = data.map(item => ({
      Wilayah: item.wilayah,
      "Tahun Lalu": item.stunting_lalu,
      Prediksi: item.prediksi || item.prediksi_baru,
      Selisih: item.selisih,
      Tanggal: item.tanggal?.seconds ? new Date(item.tanggal.seconds * 1000).toLocaleString('id-ID') : 'Baru'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Prediksi");
    XLSX.writeFile(wb, filename);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        wilayah: "Kabupaten Bogor",
        puskesmas: 10,
        stuntingLalu: 150,
        giziKurangLalu: 200,
        airMinumLalu: 85.5,
        sanitasiLalu: 70.2,
        kemiskinanLalu: 500000
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template-analisis-massal.xlsx");
  };

  const downloadCSVTemplate = () => {
    const headers = "wilayah,puskesmas,stuntingLalu,giziKurangLalu,airMinumLalu,sanitasiLalu,kemiskinanLalu\n";
    const sampleRow = "Kabupaten Bogor,10,150,200,85.5,70.2,500000";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template-analisis-massal.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TrendBadge = ({ diff }: { diff: number }) => {
    const isUp = diff > 0;
    const isNeutral = diff === 0;
    if (isNeutral) return <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">Tetap</span>;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isUp ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
        {isUp ? "↑" : "↓"} {Math.abs(diff).toLocaleString("id-ID")} {isUp ? "Naik" : "Turun"}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-indigo-100">
      
      {/* Sidebar Nav */}
      <nav className="fixed left-0 top-0 h-full w-24 bg-white border-r border-slate-200 flex flex-col items-center py-8 z-50 hidden md:flex">
        <div className="flex flex-col gap-8">
          {[
            { id: "dashboard", icon: ICONS.Dashboard, label: "Dashboard" },
            { id: "manual", icon: ICONS.Predict, label: "Prediksi" },
            { id: "excel", icon: ICONS.Batch, label: "Massal" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <div className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? "bg-indigo-50" : "group-hover:bg-slate-50"}`}>
                {tab.icon("w-6 h-6")}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="md:pl-24 pb-20">
        
        {/* Header */}
        <header className="sticky top-0 z-40 px-6 py-6 bg-white flex justify-between items-center border-b border-slate-100">
          <div>
            <h1 className="text-gradient text-xl font-black tracking-tight uppercase">Prediksi Stunting Wilayah Jawa Barat</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sistem AI Aktif</span>
             </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
          {error && (
            <div className="flex items-center gap-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 animate-fade-up">
              {ICONS.Alert("w-5 h-5")}
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="animate-fade-up space-y-10">
              {isLoadingDB ? (
                <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading ...</p>
                </div>
              ) : riwayatPrediksi.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight text-center">Belum ada data yang tersimpan</h3>
                  <p className="text-slate-400 mt-2 font-medium text-center">Lakukan prediksi terlebih dahulu untuk melihat analitik di sini.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: "Total Prediksi", val: riwayatPrediksi.length, unit: "Rekam", color: "indigo" },
                      { label: "Puncak Prevalensi", val: riwayatPrediksi.length ? Math.max(...riwayatPrediksi.map(r => r.prediksi_baru)).toLocaleString("id-ID") : 0, unit: "Jiwa", color: "rose" },
                      { label: "Analisis Terakhir", val: riwayatPrediksi.length && riwayatPrediksi[riwayatPrediksi.length - 1] ? riwayatPrediksi[riwayatPrediksi.length - 1].wilayah : "Nihil", unit: "Wilayah", color: "emerald" }
                    ].map((stat, i) => (
                      <div key={i} className="group p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                           <h3 className="text-4xl font-black tracking-tight">{stat.val}</h3>
                           <span className="text-xs font-bold text-slate-400 uppercase">{stat.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="mb-8">
                      <h3 className="text-lg font-black tracking-tight">Tren Prediksi Lokasi</h3>
                      <p className="text-xs font-medium text-slate-400">Perbandingan data aktual tahun lalu vs prediksi model Random Forest</p>
                    </div>
                    
                    <div className="min-h-[320px] h-80 w-full mb-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={riwayatPrediksi} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="wilayah" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <RechartsTooltip 
                            contentStyle={{border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                            itemStyle={{fontWeight: 800, fontSize: '12px'}}
                          />
                          <Area type="monotone" dataKey="stunting_lalu" stroke="#CBD5E1" strokeWidth={2} fill="transparent" name="Aktual Lalu" />
                          <Area type="monotone" dataKey="prediksi_baru" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorPred)" name="Prediksi AI" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="border-t border-slate-50 pt-8">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Riwayat Prediksi Terbaru</h3>
                        <button 
                          onClick={() => downloadExcel(riwayatPrediksi, "riwayat-stunting.xlsx")}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          UNDUH EXCEL
                        </button>
                      </div>
                      <div className="overflow-hidden border border-slate-50 rounded-2xl">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Wilayah</th>
                              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Hasil Prediksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {riwayatPrediksi.slice(-5).reverse().map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-slate-700 uppercase">{row.wilayah}</p>
                                  <p className="text-[10px] text-slate-300 font-bold">{row.tanggal?.seconds ? new Date(row.tanggal.seconds * 1000).toLocaleDateString('id-ID') : 'Baru'}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-indigo-600">{row.prediksi_baru.toLocaleString("id-ID")}</span>
                                    <TrendBadge diff={row.selisih} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "manual" && (
            <div className="max-w-3xl mx-auto space-y-10 animate-fade-up">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">Prediksi Stunting</h2>
                <p className="text-slate-500 font-medium">Input parameter wilayah untuk memprediksi probabilitas kasus stunting.</p>
              </div>

              <form onSubmit={submitManual} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 block">Pilih Wilayah</label>
                  <input 
                    type="text" 
                    placeholder="Cari kabupaten atau kota..." 
                    value={searchWilayah} 
                    onChange={(e) => { setSearchWilayah(e.target.value); setIsDropdownOpen(true); }} 
                    onFocus={() => setIsDropdownOpen(true)} 
                    className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all" 
                  />
                  {isDropdownOpen && filteredWilayah.length > 0 && (
                    <ul className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2 glass">
                      {filteredWilayah.map((w) => (
                        <li 
                          key={w} 
                          className="px-4 py-3 hover:bg-indigo-50 rounded-xl cursor-pointer text-sm font-bold text-slate-700 transition-colors" 
                          onClick={() => { setWilayah(w); setSearchWilayah(w); setIsDropdownOpen(false); }}
                        >
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {[
                  { label: "Jumlah Puskesmas", name: "puskesmas", tip: "Total pusat kesehatan aktif" },
                  { label: "Total Stunting Lalu", name: "stuntingLalu", tip: "Jumlah kasus tahun sebelumnya" },
                  { label: "Balita Gizi Kurang", name: "giziKurangLalu", tip: "Kasus gizi buruk tercatat" },
                  { label: "Akses Air Layak (%)", name: "airMinumLalu", tip: "Persentase cakupan air bersih" },
                  { label: "Akses Sanitasi (%)", name: "sanitasiLalu", tip: "Persentase fasilitas higienis" },
                  { label: "Garis Kemiskinan", name: "kemiskinanLalu", tip: "Ambang batas ekonomi (Rp)" }
                ].map((item, idx) => (
                  <div key={idx} className="group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block group-focus-within:text-indigo-500 transition-colors">{item.label}</label>
                    <input 
                      type="text" 
                      name={item.name} 
                      required 
                      value={formData[item.name]} 
                      onChange={handleInputChange} 
                      onBlur={handleBlur} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all" 
                      placeholder="0" 
                    />
                    <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-wide">{item.tip}</p>
                  </div>
                ))}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="md:col-span-2 w-full mt-4 bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-200 hover:bg-black hover:shadow-black/10 transition-all uppercase tracking-[0.2em] transform active:scale-95 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : "Process"}
                </button>
              </form>

              {hasilManual && (
                <div className={`p-10 rounded-[3rem] border ${hasilManual.diff > 0 ? "bg-rose-50/50 border-rose-100" : "bg-emerald-50/50 border-emerald-100"}`}>
                  <div className="flex flex-col items-center text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Hasil Estimasi untuk {wilayah}</p>
                    <div className="bg-white px-16 py-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 animate-float text-center">
                       <h4 className={`text-8xl font-black tracking-tighter ${hasilManual.diff > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                         {hasilManual.prediction.toLocaleString("id-ID")}
                       </h4>
                       <p className="text-sm font-black text-slate-300 uppercase tracking-widest mt-4">Proyeksi Kasus</p>
                    </div>
                    <div className="mt-8">
                       <TrendBadge diff={hasilManual.diff} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "excel" && (
            <div className="space-y-10 animate-fade-up">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black tracking-tight">Analisis Massal</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black hover:bg-indigo-100 transition-all active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    TEMPLATE EXCEL
                  </button>
                  <button 
                    onClick={downloadCSVTemplate}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all active:scale-95 border border-slate-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    TEMPLATE CSV
                  </button>
                </div>
              </div>

              <form onSubmit={submitBatch} className="space-y-8">
                <div className="relative group border-2 border-dashed border-indigo-200 bg-white hover:bg-slate-50 hover:border-indigo-400 p-20 rounded-[3rem] text-center transition-all">
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      {ICONS.Batch("w-8 h-8 text-indigo-600")}
                    </div>
                    <div>
                      <p className="text-lg font-black tracking-tight">{file ? file.name : "Pilih file dataset"}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Format Excel atau CSV</p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !file} 
                  className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center disabled:opacity-50"
                >
                   {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "Processes"}
                </button>
              </form>

              {hasilBatch.length === 0 && !loading ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    {ICONS.Batch("w-8 h-8 text-slate-300")}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight text-center">Belum ada hasil analisis</h3>
                  <p className="text-slate-400 mt-1 font-medium text-center">Unggah file dan mulai analisis untuk melihat hasil di sini.</p>
                </div>
              ) : (
                hasilBatch.length > 0 && (
                  <div className="space-y-12 animate-fade-up">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                        <div className="text-center md:text-left">
                          <h3 className="text-xl font-black tracking-tight uppercase">Komparasi Regional</h3>
                          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">10 Wilayah dengan Risiko Tertinggi</p>
                        </div>
                        <button 
                          onClick={() => downloadExcel(hasilBatch, "hasil-analisis-massal.xlsx")}
                          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl text-xs font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          UNDUH HASIL EXCEL
                        </button>
                      </div>
                      <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartDataBatch} margin={{ bottom: 80, top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <RechartsTooltip 
                              contentStyle={{border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                              cursor={{fill: '#f8fafc'}}
                            />
                            <Bar dataKey="Tahun Lalu" fill="#E2E8F0" radius={[10, 10, 0, 0]} barSize={20} />
                            <Bar dataKey="Prediksi" radius={[10, 10, 0, 0]} barSize={20}>
                               {chartDataBatch.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.diff > 0 ? "#F43F5E" : "#10B981"} />
                               ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="overflow-hidden border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Wilayah</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Aktual Lalu</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Prediksi AI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {hasilBatch.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-8 py-6">
                                 <p className="text-sm font-black text-slate-700 uppercase group-hover:text-indigo-600 transition-colors">{row.wilayah}</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <p className="text-xs font-bold text-slate-400">{row.stunting_lalu.toLocaleString("id-ID")}</p>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex flex-col items-end gap-2">
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{row.prediksi.toLocaleString("id-ID")}</p>
                                    <TrendBadge diff={row.selisih} />
                                 </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 md:hidden flex justify-around py-4 z-50 shadow-lg">
         {[
            { id: "dashboard", icon: ICONS.Dashboard },
            { id: "manual", icon: ICONS.Predict },
            { id: "excel", icon: ICONS.Batch }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? "text-indigo-600 bg-indigo-50 shadow-sm shadow-indigo-200/50" : "text-slate-400"}`}
            >
              {tab.icon("w-6 h-6")}
            </button>
          ))}
      </nav>

    </main>
  );
}