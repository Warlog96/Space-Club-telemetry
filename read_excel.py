import openpyxl
import json

wb = openpyxl.load_workbook(r'c:\Users\avaneesh\OneDrive\Documents\Desktop\Admin Telemetry Interface\Admin Telemetry Interface\YT.xlsx')
ws = wb['Sensor Data']
rows = list(ws.iter_rows(values_only=True))
data_rows = rows[1:]  # skip header

output = []
for i, r in enumerate(data_rows):
    bmp_alt     = r[1]  if isinstance(r[1],  (int, float)) else 0
    bmp_temp    = r[2]  if isinstance(r[2],  (int, float)) else 25
    bmp_pres    = r[3]  if isinstance(r[3],  (int, float)) else 1013.25
    acc_x       = r[4]  if isinstance(r[4],  (int, float)) else 0
    acc_y       = r[5]  if isinstance(r[5],  (int, float)) else 0
    acc_z       = r[6]  if isinstance(r[6],  (int, float)) else 0
    gyro_x      = r[12] if isinstance(r[12], (int, float)) else 0
    gyro_y      = r[13] if isinstance(r[13], (int, float)) else 0
    gyro_z      = r[14] if isinstance(r[14], (int, float)) else 0
    mpu_temp    = r[15] if isinstance(r[15], (int, float)) else 25

    output.append({
        "bmp_alt_m":     round(bmp_alt,  4),
        "bmp_temp_c":    round(bmp_temp, 4),
        "bmp_pres_hpa":  round(bmp_pres, 4),
        "acc_x":         round(acc_x,    4),
        "acc_y":         round(acc_y,    4),
        "acc_z":         round(acc_z,    4),
        "gyro_x":        round(gyro_x,   4),
        "gyro_y":        round(gyro_y,   4),
        "gyro_z":        round(gyro_z,   4),
        "mpu_temp_c":    round(mpu_temp, 4),
    })

with open('excel_data.json', 'w') as f:
    json.dump(output, f)

print(f"Exported {len(output)} rows to excel_data.json")
print("Sample row 0:", json.dumps(output[0], indent=2))
print("Sample row 337 (peak):", json.dumps(output[337], indent=2))
