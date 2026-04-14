# Troubleshooting Anthropic Connection in n8n - Firewall & Port 443

## Step 1: Diagnose the Connection Issue

First, let's confirm the problem is actually firewall-related by testing from the machine running n8n:

```bash
# Test basic connectivity to Anthropic's API
curl -v https://api.anthropic.com/v1/messages 2>&1 | head -20

# Test if port 443 is reachable
nc -zv api.anthropic.com 443

# Alternative using telnet
telnet api.anthropic.com 443

# Test DNS resolution
nslookup api.anthropic.com
dig api.anthropic.com
```

If these fail, it's a network/firewall issue. If they succeed, the problem is likely in n8n configuration.

---

## Step 2: Check Current Firewall Rules

### Linux (iptables)
```bash
# List all current rules
sudo iptables -L -n -v

# Specifically check OUTPUT chain for port 443
sudo iptables -L OUTPUT -n -v | grep 443

# Check if there's a default DROP/REJECT policy on OUTPUT
sudo iptables -L OUTPUT -n | head -1
```

### Linux (UFW - Ubuntu/Debian)
```bash
# Check UFW status and rules
sudo ufw status verbose

# Check if outbound is restricted
sudo ufw status numbered
```

### Linux (firewalld - RHEL/CentOS/Fedora)
```bash
# Check active zones and rules
sudo firewall-cmd --list-all

# Check if HTTPS is allowed
sudo firewall-cmd --list-services
sudo firewall-cmd --list-ports
```

### Linux (nftables)
```bash
# List all rules
sudo nft list ruleset
```

### Windows
```powershell
# Check outbound rules for port 443
netsh advfirewall firewall show rule name=all dir=out | findstr /i "443"

# Or use PowerShell
Get-NetFirewallRule -Direction Outbound | Where-Object {$_.Enabled -eq 'True'} |
  Get-NetFirewallPortFilter | Where-Object {$_.RemotePort -eq 443}
```

---

## Step 3: Open Port 443 Outbound

### iptables
```bash
# Allow outbound HTTPS traffic
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# If you also need to allow the return traffic (stateful)
sudo iptables -A INPUT -p tcp --sport 443 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Make rules persistent (Debian/Ubuntu)
sudo apt-get install iptables-persistent
sudo netfilter-persistent save

# Make rules persistent (RHEL/CentOS)
sudo service iptables save
```

### UFW
```bash
# Allow outbound HTTPS
sudo ufw allow out 443/tcp

# If you want to be more specific (only to Anthropic)
sudo ufw allow out to any port 443 proto tcp

# Reload
sudo ufw reload

# Verify
sudo ufw status
```

### firewalld
```bash
# Allow HTTPS service
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# OR allow port directly
sudo firewall-cmd --permanent --add-port=443/tcp --direction=out
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### Windows
```powershell
# Create outbound rule for port 443
netsh advfirewall firewall add rule name="Allow HTTPS Outbound" ^
  dir=out action=allow protocol=tcp remoteport=443

# Or via PowerShell
New-NetFirewallRule -DisplayName "Allow HTTPS Outbound" `
  -Direction Outbound -Protocol TCP -RemotePort 443 -Action Allow
```

---

## Step 4: Docker-Specific Considerations

If n8n is running in Docker (very common), the firewall issue may be at the Docker level:

```bash
# Check Docker network settings
docker inspect <n8n-container-id> | grep -A 20 "Network
