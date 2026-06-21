# Configuración del Entorno de Laboratorio

Este documento detalla la infraestructura virtualizada configurada para la simulación de ataque y remediación sobre la aplicación web AutoApply Bot.

## 1. Configuraciones Internas (Ubuntu Server)

### Configuración de IP Estática (Netplan)
Para garantizar la conectividad constante dentro de la red interna, se configuró una IP estática en la máquina víctima editando el archivo de Netplan (`/etc/netplan/00-installer-config.yaml`):

```yaml
network:
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      dhcp4: false
      addresses:
        - 192.168.5.20/24
  version: 2
```
### Configuración del Servicio SSH
Se instaló OpenSSH Server y se habilitó el acceso modificando el puerto de escucha predeterminado en `/etc/ssh/sshd_config`:

```
Port 2222
```

Tras el cambio, el servicio fue reiniciado y habilitado en el arranque.

---