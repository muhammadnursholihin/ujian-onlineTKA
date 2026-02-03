const URL_CLOUD = "https://script.google.com/macros/s/AKfycbzAVOv9WvXOUFHp_Sgn4CSGRY6HD-Ued6h_WzQOeB5aXvkIRqN7faU2bHsqnX965EeKpQ/exec"; 
const TOKEN_WAJIB = "TKA26"; 

let bankSoal = [], cloudSiswa = [], currentUser = null;
let pelanggaran = 0, isWarningActive = false, jawabanSiswa = {}, sisaWaktu = 0;

// 1. Ambil Data dari Cloud saat Start
window.onload = async () => {
    try {
        const res = await fetch(URL_CLOUD);
        const data = await res.json();
        bankSoal = data.soal;
        cloudSiswa = data.siswa;
        document.getElementById('loader').style.display = "none";
    } catch (e) {
        alert("Gagal terhubung ke Cloud. Periksa URL_CLOUD atau koneksi internet.");
    }
};

// 2. Sistem Login Cloud
async function prosesLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    const userFound = cloudSiswa.find(s => s.user == u && s.pass == p);
    
    if (!userFound) return alert("Username atau Password salah!");
    if (userFound.blokir === "YA") return alert("AKUN ANDA TELAH DIBLOKIR!");

    currentUser = { nama: userFound.nama, user: u };
    document.getElementById('user-display').innerText = currentUser.nama;
    document.getElementById('login-overlay').style.display = "none";
    document.getElementById('main-dashboard').style.display = "flex";
}

// 3. Mulai Ujian & Aktifkan Keamanan
function startUjian() {
    const t = prompt("Masukkan Token Ujian:");
    if (t !== TOKEN_WAJIB) return alert("Token Salah!");

    document.getElementById('welcome-screen').style.display = "none";
    document.getElementById('ujian-screen').style.display = "block";
    document.getElementById('timer-box').style.display = "block";
    
    renderSoal();
    mulaiTimer(60); 
    aktifkanAntiCheat();
}

function aktifkanAntiCheat() {
    window.onblur = async () => {
        if (isWarningActive) return;
        isWarningActive = true;
        pelanggaran++;
        
        document.getElementById('warning-box').style.display = "block";
        document.getElementById('warning-box').innerText = `Pelanggaran: ${pelanggaran}/3`;

        if (pelanggaran >= 3) {
            alert("ANDA TERDETEKSI CURANG! Akun diblokir otomatis.");
            await laporBlokir();
            location.reload();
        } else {
            setTimeout(() => {
                alert(`DILARANG PINDAH TAB!\nPelanggaran: ${pelanggaran}/3\nJika mencapai 3x, akun Anda akan dikunci.`);
                isWarningActive = false;
            }, 100);
        }
    };
}

async function laporBlokir() {
    await fetch(URL_CLOUD, {
        method: 'POST',
        body: JSON.stringify({ type: "BLOKIR", user: currentUser.user })
    });
}

function renderSoal() {
    let html = "";
    bankSoal.forEach((s, i) => {
        html += `
        <div class="card">
            <p><strong>${i+1}. ${s.tanya}</strong></p>
            ${s.tipe === "PG" ? `
                <label class="opsi-item"><input type="radio" name="q${i}" value="A" onchange="simpanJawaban(${i}, 'A')"> A. ${s.A}</label>
                <label class="opsi-item"><input type="radio" name="q${i}" value="B" onchange="simpanJawaban(${i}, 'B')"> B. ${s.B}</label>
                <label class="opsi-item"><input type="radio" name="q${i}" value="C" onchange="simpanJawaban(${i}, 'C')"> C. ${s.C}</label>
                <label class="opsi-item"><input type="radio" name="q${i}" value="D" onchange="simpanJawaban(${i}, 'D')"> D. ${s.D}</label>
            ` : `
                <textarea style="width:100%; height:80px; padding:10px; border-radius:8px; border:1px solid #ddd;" onkeyup="simpanJawaban(${i}, this.value)" placeholder="Ketik jawaban essay..."></textarea>
            `}
        </div>`;
    });
    document.getElementById('render-soal').innerHTML = html;
}

function simpanJawaban(index, val) {
    jawabanSiswa[index] = val;
}

function mulaiTimer(menit) {
    sisaWaktu = menit * 60;
    const interval = setInterval(() => {
        let m = Math.floor(sisaWaktu / 60);
        let s = sisaWaktu % 60;
        document.getElementById('timer-box').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (sisaWaktu <= 0) {
            clearInterval(interval);
            kirimKeCloud("WAKTU HABIS");
        }
        sisaWaktu--;
    }, 1000);
}

async function confirmSubmit() {
    if (confirm("Yakin ingin mengirim semua jawaban?")) {
        document.getElementById('loader').style.display = "flex";
        document.querySelector('#loader p').innerText = "Mengirim Nilai...";
        await kirimKeCloud();
    }
}

async function kirimKeCloud(statusManual) {
    window.onblur = null; 
    let benar = 0;
    let totalPG = bankSoal.filter(s => s.tipe === "PG").length;

    bankSoal.forEach((s, i) => {
        if (s.tipe === "PG" && jawabanSiswa[i] === s.kunci) benar++;
    });

    let skorFinal = statusManual || (benar / (totalPG || 1) * 100).toFixed(2);

    await fetch(URL_CLOUD, {
        method: 'POST',
        body: JSON.stringify({
            type: "SUBMIT",
            nama: currentUser.nama,
            skor: skorFinal,
            waktu: new Date().toLocaleString(),
            jawaban: JSON.stringify(jawabanSiswa)
        })
    });

    alert("Ujian Selesai! Nilai Anda: " + skorFinal);
    location.reload();

}
