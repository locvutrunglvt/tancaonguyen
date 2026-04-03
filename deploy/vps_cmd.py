"""Run a single command on VPS via SSH"""
import paramiko
import sys

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "echo 'No command'"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

if out:
    print(out)
if err:
    print(f"[STDERR] {err}", file=sys.stderr)

ssh.close()
sys.exit(exit_code)
