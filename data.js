// Port Patrol — port data
// exams: N = Network+ (N10-009 objective 1.4 official list)
//        S = Security+ (commonly tested)
//        C = CCNA (commonly tested)
// proto: transport in normal use
// pair: id of the secure / insecure counterpart (if any)
window.PORTS = [
  { id: "ftp",    ports: [20, 21],     name: "FTP",        full: "File Transfer Protocol",                proto: "TCP",     exams: "NSC", secure: false, pair: "sftp", tip: "21 is the control channel, 20 carries data in active mode. Credentials travel in cleartext." },
  { id: "sftp",   ports: [22],         name: "SFTP",       full: "SSH File Transfer Protocol",            proto: "TCP",     exams: "NS",  secure: true,  pair: "ftp",  tip: "File transfer tunneled inside SSH, so it shares port 22. The secure replacement for FTP." },
  { id: "ssh",    ports: [22],         name: "SSH",        full: "Secure Shell",                          proto: "TCP",     exams: "NSC", secure: true,  pair: "telnet", tip: "Encrypted remote command line. SCP and SFTP also ride on 22." },
  { id: "telnet", ports: [23],         name: "Telnet",     full: "Telnet",                                proto: "TCP",     exams: "NSC", secure: false, pair: "ssh",  tip: "Plaintext remote login. If you see 23 open on an exam, the fix is usually 'replace with SSH'." },
  { id: "tacacs", ports: [49],         name: "TACACS+",    full: "Terminal Access Controller Access-Control System Plus", proto: "TCP", exams: "SC", secure: true, tip: "Cisco AAA protocol. Encrypts the entire payload and separates authentication, authorization, and accounting." },
  { id: "smtp",   ports: [25],         name: "SMTP",       full: "Simple Mail Transfer Protocol",         proto: "TCP",     exams: "NSC", secure: false, pair: "smtps", tip: "Server-to-server mail relay. Sends mail; it does not retrieve it." },
  { id: "dns",    ports: [53],         name: "DNS",        full: "Domain Name System",                    proto: "TCP/UDP", exams: "NSC", secure: false, tip: "UDP for normal queries, TCP for zone transfers and large responses." },
  { id: "dhcp",   ports: [67, 68],     name: "DHCP",       full: "Dynamic Host Configuration Protocol",   proto: "UDP",     exams: "NSC", secure: false, tip: "67 is the server, 68 is the client. Remember DORA: Discover, Offer, Request, Acknowledge." },
  { id: "tftp",   ports: [69],         name: "TFTP",       full: "Trivial File Transfer Protocol",        proto: "UDP",     exams: "NSC", secure: false, tip: "No authentication. Used to push router/switch configs and firmware images." },
  { id: "http",   ports: [80],         name: "HTTP",       full: "Hypertext Transfer Protocol",           proto: "TCP",     exams: "NSC", secure: false, pair: "https", tip: "Unencrypted web traffic." },
  { id: "kerberos", ports: [88],       name: "Kerberos",   full: "Kerberos Authentication",               proto: "TCP/UDP", exams: "S",   secure: true,  tip: "Ticket-based authentication used by Active Directory. Clock skew (see NTP) breaks it." },
  { id: "pop3",   ports: [110],        name: "POP3",       full: "Post Office Protocol v3",               proto: "TCP",     exams: "SC",  secure: false, pair: "pop3s", tip: "Downloads mail to the client, usually removing it from the server." },
  { id: "ntp",    ports: [123],        name: "NTP",        full: "Network Time Protocol",                 proto: "UDP",     exams: "NSC", secure: false, tip: "Clock sync. Drift breaks Kerberos, certificates, and log correlation." },
  { id: "netbios", ports: [137, 138, 139], name: "NetBIOS", full: "NetBIOS Name/Datagram/Session Service", proto: "TCP/UDP", exams: "S", secure: false, tip: "Legacy Windows networking. 137 name, 138 datagram, 139 session." },
  { id: "imap",   ports: [143],        name: "IMAP",       full: "Internet Message Access Protocol",      proto: "TCP",     exams: "SC",  secure: false, pair: "imaps", tip: "Keeps mail on the server and syncs across devices." },
  { id: "snmp",   ports: [161, 162],   name: "SNMP",       full: "Simple Network Management Protocol",    proto: "UDP",     exams: "NSC", secure: false, tip: "161 for polling agents, 162 for traps. Use SNMPv3 for authentication and encryption." },
  { id: "bgp",    ports: [179],        name: "BGP",        full: "Border Gateway Protocol",               proto: "TCP",     exams: "C",   secure: false, tip: "The routing protocol of the internet. Peers form a TCP session on 179." },
  { id: "ldap",   ports: [389],        name: "LDAP",       full: "Lightweight Directory Access Protocol", proto: "TCP",     exams: "NSC", secure: false, pair: "ldaps", tip: "Directory queries (think Active Directory) in cleartext." },
  { id: "https",  ports: [443],        name: "HTTPS",      full: "HTTP Secure (HTTP over TLS)",           proto: "TCP",     exams: "NSC", secure: true,  pair: "http", tip: "Web traffic encrypted with TLS. HTTP/3 uses QUIC over UDP 443." },
  { id: "smb",    ports: [445],        name: "SMB",        full: "Server Message Block",                  proto: "TCP",     exams: "NS",  secure: false, tip: "Windows file and printer sharing. Famous for WannaCry/EternalBlue." },
  { id: "smtpssl",ports: [465],        name: "SMTPS (465)",full: "SMTP over implicit TLS",                proto: "TCP",     exams: "S",   secure: true,  tip: "Implicit TLS mail submission. Network+ labels 587 as SMTPS; many Security+ guides list 465." },
  { id: "ike",    ports: [500],        name: "IKE / ISAKMP", full: "Internet Key Exchange (IPsec)",       proto: "UDP",     exams: "SC",  secure: true,  tip: "Negotiates IPsec security associations for VPNs." },
  { id: "syslog", ports: [514],        name: "Syslog",     full: "System Logging Protocol",               proto: "UDP",     exams: "NSC", secure: false, tip: "Centralized log collection, feeding your SIEM." },
  { id: "rip",    ports: [520],        name: "RIP",        full: "Routing Information Protocol",          proto: "UDP",     exams: "C",   secure: false, tip: "Distance-vector routing, hop count max 15." },
  { id: "smtps",  ports: [587],        name: "SMTPS",      full: "SMTP Secure (mail submission)",         proto: "TCP",     exams: "NS",  secure: true,  pair: "smtp", tip: "Authenticated client mail submission with STARTTLS. Network+ N10-009 calls 587 SMTPS." },
  { id: "ldaps",  ports: [636],        name: "LDAPS",      full: "LDAP over SSL/TLS",                     proto: "TCP",     exams: "NS",  secure: true,  pair: "ldap", tip: "Directory queries protected by TLS." },
  { id: "ftps",   ports: [989, 990],   name: "FTPS",       full: "FTP over SSL/TLS",                      proto: "TCP",     exams: "S",   secure: true,  tip: "FTP wrapped in TLS. Different from SFTP, which runs over SSH on 22." },
  { id: "imaps",  ports: [993],        name: "IMAPS",      full: "IMAP over SSL/TLS",                     proto: "TCP",     exams: "S",   secure: true,  pair: "imap", tip: "Secure IMAP." },
  { id: "pop3s",  ports: [995],        name: "POP3S",      full: "POP3 over SSL/TLS",                     proto: "TCP",     exams: "S",   secure: true,  pair: "pop3", tip: "Secure POP3." },
  { id: "mssql",  ports: [1433],       name: "SQL Server", full: "Microsoft SQL Server",                  proto: "TCP",     exams: "NS",  secure: false, tip: "Default instance of Microsoft SQL Server." },
  { id: "l2tp",   ports: [1701],       name: "L2TP",       full: "Layer 2 Tunneling Protocol",            proto: "UDP",     exams: "S",   secure: false, tip: "VPN tunneling with no encryption of its own, so it is paired with IPsec." },
  { id: "pptp",   ports: [1723],       name: "PPTP",       full: "Point-to-Point Tunneling Protocol",     proto: "TCP",     exams: "S",   secure: false, tip: "Legacy, broken VPN protocol. Do not use it." },
  { id: "radius", ports: [1812, 1813], name: "RADIUS",     full: "Remote Authentication Dial-In User Service", proto: "UDP", exams: "SC", secure: false, tip: "1812 authentication, 1813 accounting. Encrypts only the password." },
  { id: "mysql",  ports: [3306],       name: "MySQL",      full: "MySQL Database",                        proto: "TCP",     exams: "S",   secure: false, tip: "Default MySQL / MariaDB port." },
  { id: "rdp",    ports: [3389],       name: "RDP",        full: "Remote Desktop Protocol",               proto: "TCP/UDP", exams: "NSC", secure: false, tip: "Graphical remote access to Windows. Never expose it straight to the internet." },
  { id: "natt",   ports: [4500],       name: "IPsec NAT-T",full: "IPsec NAT Traversal",                   proto: "UDP",     exams: "C",   secure: true,  tip: "Wraps ESP in UDP so IPsec VPNs work through NAT." },
  { id: "sip",    ports: [5060, 5061], name: "SIP",        full: "Session Initiation Protocol",           proto: "TCP/UDP", exams: "NS",  secure: false, tip: "VoIP call setup. 5060 is cleartext, 5061 is SIP over TLS." },
  { id: "postgres", ports: [5432],     name: "PostgreSQL", full: "PostgreSQL Database",                   proto: "TCP",     exams: "",    secure: false, tip: "Default PostgreSQL port." },
  { id: "vnc",    ports: [5900],       name: "VNC",        full: "Virtual Network Computing",             proto: "TCP",     exams: "",    secure: false, tip: "Cross-platform remote desktop sharing." },
  { id: "httpalt",ports: [8080],       name: "HTTP-Alt",   full: "HTTP Alternate / Proxy",                proto: "TCP",     exams: "",    secure: false, tip: "Common for web proxies and dev servers." },
];

window.DECKS = {
  netplus: { label: "Network+",  sub: "N10-009 official list", code: "N" },
  secplus: { label: "Security+", sub: "SY0-701 commonly tested", code: "S" },
  ccna:    { label: "CCNA",      sub: "200-301 commonly tested", code: "C" },
  all:     { label: "Full deck", sub: "Every port in the game", code: "" },
};
