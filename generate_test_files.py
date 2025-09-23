"""
Test Data Generator - Creates CSV files with different column names
Author: An9
"""
import csv
import random
from datetime import datetime, timedelta

def generate_sensor_dataset_alpha(replicate=1):
    """Generate IoT Sensor Network themed test data"""
    headers = [
        'Node_ID', 'Grid_X', 'Grid_Y', 'Latency_ms', 'V_Input', 'Amp_Draw',
        'Ambient_Temp', 'Ohm_Value', 'Cap_uF', 'RSSI', 'Timestamp',
        'Technician', 'Device_Serial', 'Run_ID', 'Status', 'Wattage'
    ]

    rows = []
    base_time = datetime(2025, 3, 14 + replicate, 9, 0, 0)
    technicians = ['Tech1', 'Tech2', 'Tech3']
    devices = ['DEV-A01', 'DEV-A02', 'DEV-A03']
    statuses = ['OK', 'OK', 'OK', 'OK', 'WARN', 'FAIL']

    for i in range(1, 21):
        # Randomly skip some values to test missing data handling
        amp_draw = round(random.uniform(180, 230), 1) if random.random() > 0.1 else ''
        cap_uf = round(random.uniform(90, 110), 2) if random.random() > 0.1 else ''
        wattage = round(random.uniform(0.7, 0.95), 3) if amp_draw != '' else ''

        row = [
            f'N{i:03d}',  # Node_ID
            random.randint(1, 5),  # Grid_X
            random.randint(1, 5),  # Grid_Y
            round(random.uniform(4.0, 5.2), 3),  # Latency_ms
            round(random.uniform(3.8, 4.2), 3),  # V_Input
            amp_draw,  # Amp_Draw
            round(random.uniform(23, 28), 1),  # Ambient_Temp
            round(random.uniform(45, 56), 2),  # Ohm_Value
            cap_uf,  # Cap_uF
            round(random.uniform(88, 99), 1),  # RSSI
            (base_time + timedelta(minutes=i*10)).strftime('%Y-%m-%d %H:%M:%S'),  # Timestamp
            random.choice(technicians),  # Technician
            random.choice(devices),  # Device_Serial
            f'RUN-2025031{14+replicate}-A',  # Run_ID
            random.choice(statuses),  # Status
            wattage  # Wattage
        ]
        rows.append(row)

    filename = f'data/Sensor_Dataset_Alpha_R{replicate}.csv'
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Created: {filename}")


def generate_manufacturing_qc_beta(replicate=1):
    """Generate Manufacturing Quality Control themed test data"""
    headers = [
        'Unit_Code', 'Position_Col', 'Position_Row', 'Response_Time', 'Potential_V',
        'Flow_mA', 'Heat_C', 'Impedance_Ohm', 'Storage_pF', 'Quality_Score',
        'Inspection_DateTime', 'Inspector', 'Station_ID', 'Lot_Number',
        'Outcome', 'Energy_W', 'Freq_Hz', 'Z_Magnitude', 'Theta_Deg'
    ]

    rows = []
    base_time = datetime(2025, 3, 15 + replicate, 8, 30, 0)
    inspectors = ['INS1', 'INS2', 'INS3']
    stations = ['STN-B01', 'STN-B02', 'STN-B03', 'STN-B04']
    outcomes = ['PASS', 'PASS', 'PASS', 'PASS', 'CHECK', 'REJECT']

    for i in range(1, 21):
        # Randomly skip some values to test missing data handling
        flow_ma = round(random.uniform(185, 225), 1) if random.random() > 0.12 else ''
        storage_pf = round(random.uniform(165, 350), 1) if random.random() > 0.1 else ''
        energy_w = round(random.uniform(25, 125), 2) if flow_ma != '' else ''
        z_magnitude = round(random.uniform(60, 92), 1) if random.random() > 0.08 else ''

        row = [
            f'U{i:03d}',  # Unit_Code
            random.randint(75, 170),  # Position_Col
            random.randint(40, 160),  # Position_Row
            round(random.uniform(0.14, 0.36), 3),  # Response_Time
            round(random.uniform(12, 40), 1),  # Potential_V
            flow_ma,  # Flow_mA
            round(random.uniform(35, 72), 1),  # Heat_C
            round(random.uniform(130, 380), 1),  # Impedance_Ohm
            storage_pf,  # Storage_pF
            round(random.uniform(87, 97), 1),  # Quality_Score
            (base_time + timedelta(hours=i*0.5)).strftime('%Y-%m-%d %H:%M:%S'),  # Inspection_DateTime
            random.choice(inspectors),  # Inspector
            random.choice(stations),  # Station_ID
            f'LOT-2025031{15+replicate}-B',  # Lot_Number
            random.choice(outcomes),  # Outcome
            energy_w,  # Energy_W
            random.randint(14000, 28000),  # Freq_Hz
            z_magnitude,  # Z_Magnitude
            round(random.uniform(-8, 26), 1)  # Theta_Deg
        ]
        rows.append(row)

    filename = f'data/Manufacturing_QC_Beta_R{replicate}.csv'
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Created: {filename}")


def generate_field_test_gamma(replicate=1):
    """Generate Field Testing Equipment themed test data"""
    headers = [
        'Sample_ID', 'Coord_East', 'Coord_North', 'Delay_Factor', 'EMF_Volts',
        'Discharge_A', 'Thermal_Deg', 'R_Load', 'C_Measure', 'Link_Quality',
        'Measured_At', 'Field_Agent', 'Instrument_Tag', 'Session_Ref',
        'Result_Flag', 'Power_Output', 'Oscillation_Hz', 'Complex_Z', 'Phase_Shift'
    ]

    rows = []
    base_time = datetime(2025, 3, 16 + replicate, 10, 15, 0)
    agents = ['AGT1', 'AGT2', 'AGT3', 'AGT4']
    instruments = ['INST-G01', 'INST-G02', 'INST-G03']
    result_flags = ['GOOD', 'GOOD', 'GOOD', 'GOOD', 'ISSUE', 'BAD']

    for i in range(1, 21):
        # Randomly skip some values to test missing data handling
        discharge_a = round(random.uniform(1.4, 4.7), 2) if random.random() > 0.15 else ''
        c_measure = round(random.uniform(170, 360), 1) if random.random() > 0.1 else ''
        power_output = round(random.uniform(20, 165), 2) if discharge_a != '' else ''
        r_load = round(random.uniform(135, 385), 1) if random.random() > 0.08 else ''

        row = [
            f'S{i:03d}',  # Sample_ID
            random.randint(70, 175),  # Coord_East
            random.randint(45, 165),  # Coord_North
            round(random.uniform(0.13, 0.37), 3),  # Delay_Factor
            round(random.uniform(11, 42), 1),  # EMF_Volts
            discharge_a,  # Discharge_A
            round(random.uniform(34, 73), 1),  # Thermal_Deg
            r_load,  # R_Load
            c_measure,  # C_Measure
            round(random.uniform(86, 98), 1),  # Link_Quality
            (base_time + timedelta(hours=i*0.75)).strftime('%Y-%m-%d %H:%M:%S'),  # Measured_At
            random.choice(agents),  # Field_Agent
            random.choice(instruments),  # Instrument_Tag
            f'SES-2025031{16+replicate}-G',  # Session_Ref
            random.choice(result_flags),  # Result_Flag
            power_output,  # Power_Output
            random.randint(13500, 27500),  # Oscillation_Hz
            round(random.uniform(58, 93), 1),  # Complex_Z
            round(random.uniform(-9, 27), 1)  # Phase_Shift
        ]
        rows.append(row)

    filename = f'data/Field_Test_Gamma_R{replicate}.csv'
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Created: {filename}")


if __name__ == '__main__':
    print("Generating test CSV files with different column names...")
    print("Creating 3 replicates for each theme (9 files total)...")
    print()

    # Generate 3 replicates for each theme
    for i in range(1, 4):
        print(f"--- Replicate {i} ---")
        generate_sensor_dataset_alpha(i)
        generate_manufacturing_qc_beta(i)
        generate_field_test_gamma(i)
        print()

    print("All test files generated successfully!")
    print("Total: 9 files (3 replicates × 3 themes)")
    print("These files can be used to test the system's column name recognition capabilities.")
