# Poster POS Platform Boilerplate

POS Platform Boilerplate es una [plantilla](https://github.com/joinposter/pos-platform-boilerplate) para crear aplicaciones en la plataforma POS.

Una aplicación en la plataforma POS se ejecuta en Javascript. Podemos desarrollar la aplicación en cualquier lenguaje que compile en JS (CoffeeScript, TypeScript). La aplicación se carga en el sistema en forma de un solo archivo JS (paquete) que se recopila mediante [webpack](https://webpack.js.org/).

## ¿Qué módulos se desarrollaron en esta aplicación?
* [Interfaz de pago personalizada](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/payment-interface)
    * Manejo de distintos tipos de pagos (efectivo, tarjeta, transferencia, etc)
    * Almacenamiento de comprobantes de pago en servidor
* [Generador de cotizaciones](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/cotizacion)
    * Editor drag and drop
    * Almacenado y recuperación en servidor
* [Requisiciones](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/requisicion)
    * Backup local
    * Recepción de insumos a traves de código de barras
* [Tickets personalizados](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/util)
    * Impresión y re-impresión
* [Reportes de venta](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/reporte)
    * Ventas del día en archivos **Excel**
    * Cortes de asesor tipo ticket
* [Solicitudes de factura](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/factura)
    * Envio de emails
    * Archivos adjuntos
* [Gestion de aduedos pendientes](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/util/AdeudosManager)
    * Filtros (pagado, no pagado, por asesor, etc)
* [Solicitudes de ordenes de trabajo](https://github.com/lecas93/poster-boilerplate/tree/master/main/app/components/orden-trabajo)
    * Creacion de tarjetas en Trello
    * Subida de archivos
* Seguridad
    * Restricción de acceso a ciertas funcionalidades según el rol.

Solo por mencionar algunos de los más importantes

## ¿Cómo utilizar?

1. Clonar el repositorio
2. Ir a la carpeta del proyecto
3. Agregar nuestra **applicationId** y **applicationSecret** (obtenidas desde nuestra cuenta de desarrollador Poster) en el archivo `manifest.json`
4. Ejecutar:
```bash
npm install 
npm run dev
```

Para ver más a detalle los pasos para desplegar nuestra aplicación en Poster, podemos dirigirnos a su [documentación oficial](https://dev.joinposter.com/en/docs/v3/pos/start).
