# 🚀 Guía de Inicio Rápido - ELDERCARE+

Esta guía te ayudará a ejecutar la plataforma ELDERCARE+ en tu máquina local en menos de 10 minutos.

## Prerequisitos

Asegúrate de tener instalado:

- ✅ Docker Desktop (Mac/Windows) o Docker Engine (Linux) - [Descargar](https://www.docker.com/get-started)
- ✅ Node.js 18+ - [Descargar](https://nodejs.org/)
- ✅ Git - [Descargar](https://git-scm.com/)

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-org/ELDERCARE.git
cd ELDERCARE
```

## Paso 2: Configurar Variables de Ambiente

```bash
# Copiar archivo de ejemplo
cp backend/.env.example backend/.env

# Editar (opcional para desarrollo local)
nano backend/.env  # o usa tu editor favorito
```

**Nota:** Las configuraciones por defecto funcionan para desarrollo local. No necesitas cambiar nada para empezar.

## Paso 3: Iniciar Servicios con Docker

```bash
# Iniciar todos los servicios
docker-compose up -d

# Esto iniciará:
# - PostgreSQL (con extensión TimescaleDB)
# - Redis
# - Backend API
# - LocalStack (AWS services emulados)
# - pgAdmin (administración de base de datos)
# - MailHog (pruebas de email)
```

## Paso 4: Verificar que Todo Funciona

### 4.1 Verificar Servicios

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

### 4.2 Verificar API

```bash
# Verificar salud del sistema
curl http://localhost:3000/health

# Deberías ver:
# {"status":"ok","info":{...}}
```

### 4.3 Acceder a Servicios

| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|------------|
| **API Backend** | http://localhost:3000 | - | - |
| **Documentación API** | http://localhost:3000/api/docs | - | - |
| **pgAdmin** | http://localhost:5050 | admin@eldercare.local | admin |
| **MailHog** | http://localhost:8025 | - | - |
| **LocalStack** | http://localhost:4566 | - | - |

## Paso 5: Cargar Datos de Prueba

```bash
# Ejecutar migraciones de base de datos
docker-compose exec backend npm run migration:run

# Cargar datos de prueba (seed)
docker-compose exec backend npm run seed
```

### Credenciales de Prueba

Después de cargar los datos, puedes usar estas credenciales:

**Adulto Mayor:**
- Email: `maria.gonzalez@eldercare.test`
- Password: `Elder123!`

**Familiar (Hija):**
- Email: `ana.gonzalez@eldercare.test`
- Password: `Family123!`

**Cuidador:**
- Email: `rosa.martinez@eldercare.test`
- Password: `Care123!`

**Médico:**
- Email: `dr.rodriguez@eldercare.test`
- Password: `Doctor123!`

## Paso 6: Probar la API

### 6.1 Obtener Token de Autenticación

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.gonzalez@eldercare.test",
    "password": "Elder123!"
  }'

# Copia el accessToken de la respuesta
```

### 6.2 Hacer una Petición Autenticada

```bash
# Reemplaza <TOKEN> con tu accessToken
curl http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer <TOKEN>"
```

### 6.3 Usar Swagger UI (Más Fácil)

1. Abre http://localhost:3000/api/docs
2. Haz clic en "Authorize" (botón con candado)
3. Ingresa: `Bearer <tu-token>`
4. Ahora puedes probar todos los endpoints desde el navegador

## Paso 7: Ejecutar Tests (Opcional)

```bash
# Tests unitarios
docker-compose exec backend npm run test

# Tests E2E
docker-compose exec backend npm run test:e2e

# Tests con cobertura
docker-compose exec backend npm run test:cov
```

## 🛠️ Comandos Útiles

### Gestión de Servicios

```bash
# Detener todos los servicios
docker-compose stop

# Reiniciar servicios
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Eliminar todo (⚠️ borra la base de datos)
docker-compose down -v
```

### Base de Datos

```bash
# Conectar a PostgreSQL
docker-compose exec postgres psql -U eldercare -d eldercare

# Ejecutar migraciones
docker-compose exec backend npm run migration:run

# Revertir última migración
docker-compose exec backend npm run migration:revert

# Generar nueva migración
docker-compose exec backend npm run migration:generate -- -n NombreMigracion
```

### Comandos de Desarrollo

```bash
# Acceder al contenedor del backend
docker-compose exec backend sh

# Instalar nuevas dependencias
docker-compose exec backend npm install <paquete>

# Reiniciar solo el backend
docker-compose restart backend
```

## 📱 Configurar App Móvil (React Native)

```bash
# Navegar a carpeta mobile
cd mobile

# Instalar dependencias
npm install

# iOS (Mac únicamente)
npx pod-install
npm run ios

# Android
npm run android
```

### Configurar Endpoint de API

Edita `mobile/src/config/api.ts`:

```typescript
// Para desarrollo local
export const API_BASE_URL = 'http://localhost:3000/api/v1';

// Para emulador Android
export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

// Para dispositivo físico
export const API_BASE_URL = 'http://192.168.1.X:3000/api/v1'; // Tu IP local
```

## 🐛 Solución de Problemas

### Puerto 3000 ya está en uso

```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Usa puerto 3001 en lugar de 3000
```

### PostgreSQL no inicia

```bash
# Ver logs
docker-compose logs postgres

# Eliminar volumen y reiniciar
docker-compose down -v
docker-compose up -d
```

### Backend no se conecta a la base de datos

```bash
# Verificar que PostgreSQL esté listo
docker-compose ps postgres

# Esperar 30 segundos después de iniciar PostgreSQL
# Luego reiniciar backend
docker-compose restart backend
```

### No puedo acceder a los servicios

```bash
# Verificar que los contenedores estén corriendo
docker-compose ps

# Verificar logs
docker-compose logs

# Verificar firewall
# En Mac/Windows: Docker Desktop debe estar corriendo
```

## 📚 Siguientes Pasos

1. **Explorar la API**: Abre http://localhost:3000/api/docs y prueba los endpoints
2. **Ver los datos**: Conecta pgAdmin para ver las tablas y datos
3. **Leer la documentación**:
   - [Guía de Testing](backend/TEST_README.md)
   - [Guía de Migraciones](backend/MIGRATIONS_README.md)
   - [Guía de Swagger](backend/SWAGGER_README.md)
   - [Guía completa de Docker](DOCKER_SETUP.md)
4. **Desarrollar nuevas funcionalidades**: El sistema está listo para desarrollo

## 💡 Consejos

- **Desarrollo Activo**: El backend se recarga automáticamente al cambiar archivos en `backend/src/`
- **Logs**: Siempre revisa los logs con `docker-compose logs -f` si algo falla
- **Base de Datos**: Usa pgAdmin (http://localhost:5050) para ver y editar datos
- **Emails**: Todos los emails se capturan en MailHog (http://localhost:8025)

## 🎉 ¡Listo!

Ahora tienes la plataforma ELDERCARE+ corriendo localmente. Puedes:

✅ Probar la API en Swagger UI
✅ Ver los datos en pgAdmin
✅ Ejecutar tests
✅ Desarrollar nuevas funcionalidades
✅ Integrar la app móvil

**¿Necesitas ayuda?** Revisa la documentación completa en la carpeta `docs/` o abre un issue en GitHub.

---

**Próximos Pasos Recomendados:**
1. Familiarízate con la estructura del código en `backend/src/`
2. Revisa los tests existentes en `backend/test/`
3. Lee la arquitectura del sistema en `docs/architecture/`
4. Experimenta con los endpoints de la API
