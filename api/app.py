from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app) 

try:
    model = joblib.load('model_stunting_rf_fe.pkl')
    daftar_fitur = joblib.load('daftar_fitur_stunting.pkl')
except Exception as e:
    print("GAGAL MEMUAT MODEL:", e)

# 1. RUTE UNTUK INPUT MANUAL
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        puskesmas = float(data.get('puskesmas', 0))
        gizi_kurang_lalu = float(data.get('giziKurangLalu', 0))
        air_minum_lalu = float(data.get('airMinumLalu', 0))
        sanitasi_lalu = float(data.get('sanitasiLalu', 0))
        kemiskinan_lalu = float(data.get('kemiskinanLalu', 0))
        stunting_lalu = float(data.get('stuntingLalu', 0))

        # === PROSES FEATURE ENGINEERING OTOMATIS ===
        gizi_kurang_per_stunting = gizi_kurang_lalu / (stunting_lalu + 1)
        interaksi_miskin_gizi = kemiskinan_lalu * gizi_kurang_lalu

        input_data = {
            'jumlah_puskesmas': puskesmas,
            'gizi_kurang_tahun_lalu': gizi_kurang_lalu,
            'air_minum_layak_tahun_lalu': air_minum_lalu,
            'persentase_sanitasi_layak_tahun_lalu': sanitasi_lalu,
            'garis_kemiskinan_tahun_lalu': kemiskinan_lalu,
            'gizi_kurang_per_stunting': gizi_kurang_per_stunting,
            'interaksi_miskin_gizi': interaksi_miskin_gizi
        }

        df = pd.DataFrame([input_data])
        df = df.reindex(columns=daftar_fitur, fill_value=0) 
        hasil = model.predict(df)[0]
        
        return jsonify({'prediksi': int(hasil), 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'failed'}), 400

# 2. RUTE UNTUK UPLOAD BATCH (EXCEL/CSV)
@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Tidak ada file yang diunggah', 'status': 'failed'}), 400
        
        file = request.files['file']
        
        if file.filename.endswith('.csv'):
            df_input = pd.read_csv(file)
        else:
            df_input = pd.read_excel(file)
            
        if 'stunting_tahun_lalu' in df_input.columns and 'gizi_kurang_tahun_lalu' in df_input.columns:
            df_input['gizi_kurang_per_stunting'] = df_input['gizi_kurang_tahun_lalu'] / (df_input['stunting_tahun_lalu'] + 1)
            df_input['interaksi_miskin_gizi'] = df_input['garis_kemiskinan_tahun_lalu'] * df_input['gizi_kurang_tahun_lalu']
        else:
             return jsonify({'error': 'Format kolom tidak sesuai template!', 'status': 'failed'}), 400

        wilayah_col = None
        for col in df_input.columns:
            if 'kabupaten' in col.lower() or 'kota' in col.lower() or 'wilayah' in col.lower():
                wilayah_col = col
                break
                
        df_model = df_input.reindex(columns=daftar_fitur, fill_value=0)
        prediksi = model.predict(df_model)
        
        hasil_list = []
        for i in range(len(prediksi)):
            pred_val = int(prediksi[i])
            stunting_lalu_val = int(df_input['stunting_tahun_lalu'].iloc[i])
            selisih = pred_val - stunting_lalu_val
            
            hasil_list.append({
                'id': i + 1,
                'wilayah': str(df_input[wilayah_col].iloc[i]) if wilayah_col else f"Data ke-{i+1}",
                'prediksi': pred_val,
                'stunting_lalu': stunting_lalu_val,
                'selisih': selisih
            })
            
        return jsonify({'hasil_batch': hasil_list, 'status': 'success'})

    except Exception as e:
        return jsonify({'error': str(e), 'status': 'failed'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=8000)