
'use client';
import { useState } from 'react';

export default function TrackingBulkUpload({ orders }) {
  // orders = [{id, buyerName, address}]
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Example CSV format: orderId,carrier,trackingNumber
  // Or buyerName, trackingNumber (we match by buyerName)
  
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const parseAndUpload = async () => {
    setUploading(true);
    try {
      const lines = csvText.trim().split('\n').filter(l => l.trim());
      // Skip header if contains tracking
      const startIdx = lines[0].toLowerCase().includes('tracking') || lines[0].includes('송장') ? 1 : 0;
      
      const payload = [];
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(',').map(s => s.trim().replace(/"/g, ''));
        if (cols.length < 2) continue;
        
        let orderId, carrier, tracking;
        if (cols.length === 2) {
          // buyerName, tracking
          const buyerName = cols[0];
          tracking = cols[1];
          const found = orders.find(o => o.buyerName?.includes(buyerName) || o.id.includes(buyerName));
          if (!found) continue;
          orderId = found.id;
          carrier = 'CJ대한통운';
        } else {
          // orderId, carrier, tracking
          orderId = cols[0];
          carrier = cols[1] || 'CJ대한통운';
          tracking = cols[2] || cols[1];
        }
        if (tracking) payload.push({ orderId, carrier, trackingNumber: tracking });
      }

      const res = await fetch('/api/seller/tracking-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: payload })
      });
      const data = await res.json();
      setResult(data);
      if (data.success) alert(`${data.updated}건 배송처리 완료! 구매자에게 알림 발송됨`);
    } catch (e) {
      alert('오류: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'orderId,carrier,trackingNumber\n';
    const sample = orders.slice(0,3).map(o => `${o.id},CJ대한통운,${''}`).join('\n');
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '송장_양식.csv';
    a.click();
  };

  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">📦 송장 일괄 등록 (판매자용)</h3>
        <button onClick={downloadTemplate} className="text-xs bg-gray-100 px-3 py-1.5 rounded-full">양식 다운로드</button>
      </div>
      
      <p className="text-xs text-gray-500">엑셀에서 orderId, 택배사, 송장번호 3열로 저장 → CSV로 저장 → 업로드<br/>택배사에서 받은 엑셀 그대로 복사해도 됩니다.</p>

      <input type="file" accept=".csv,.txt" onChange={handleFile} className="w-full text-sm border rounded-lg p-2" />
      
      <textarea
        value={csvText}
        onChange={e => setCsvText(e.target.value)}
        placeholder="orderId,carrier,trackingNumber
clx123,CJ대한통운,123456789012
clx124,한진택배,987654321098"
        className="w-full h-32 text-xs border rounded-lg p-3 font-mono"
      />

      <button
        onClick={parseAndUpload}
        disabled={uploading || !csvText}
        className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : `${csvText ? csvText.split('\n').filter(Boolean).length : 0}건 일괄 배송처리`}
      </button>

      {result && (
        <div className="text-xs bg-green-50 p-3 rounded-lg">
          ✅ {result.updated}건 처리 완료. 구매자들에게 "배송 시작" 알림 자동 발송됨
        </div>
      )}
    </div>
  );
}
