"""Quick redeploy frontend to VPS"""
import paramiko
import os

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected!")

# Clean and upload
stdin, stdout, stderr = ssh.exec_command("rm -rf /var/www/tcn/*")
stdout.channel.recv_exit_status()
print("Cleaned old files")

sftp = ssh.open_sftp()
def upload_dir(local, remote):
    for item in os.listdir(local):
        lp = os.path.join(local, item)
        rp = f"{remote}/{item}"
        if os.path.isdir(lp):
            try: sftp.mkdir(rp)
            except: pass
            upload_dir(lp, rp)
        else:
            sftp.put(lp, rp)
            print(f"  Uploaded: {item}")

upload_dir(DIST_DIR, "/var/www/tcn")
sftp.close()

stdin, stdout, stderr = ssh.exec_command("chown -R www-data:www-data /var/www/tcn")
stdout.channel.recv_exit_status()

print("\nDone! Frontend redeployed.")
ssh.close()
