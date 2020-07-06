/**
 * Guarda la informacion de una tarjeta trello en el servidor.
 * @param {JSON} res_tarjeta JSON con la información de la tarjeta.
 * @param {Array} res_archivo Array con la información de los archivos adjuntos.
 */
export function sendTrelloCardToServer(res_tarjeta, res_archivo, callback = null) {
    console.log(res_tarjeta);
    console.log(res_archivo);
    $.ajax({
        type: 'POST',
        data: {
            sucursal: Poster.settings.spotId,
            ticket: res_tarjeta.ticket,
            fecha_entrega: res_tarjeta.fecha_entrega,
            hora_entrega: res_tarjeta.hora_entrega,
            cliente: res_tarjeta.cliente,
            telefono: res_tarjeta.telefono,
            email: res_tarjeta.email,
            solicita: res_tarjeta.solicita,
            produce: res_tarjeta.produce,
            entrega: res_tarjeta.entrega,
            asesor: res_tarjeta.asesor,
            comentario: res_tarjeta.comentario,
            productos: res_tarjeta.productos,
            archivos: JSON.stringify(res_archivo),
            url: res_tarjeta.url
        },
        url: 'url/Ordenes/register_order',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('TRELLO TO SERVER STATUS', data);
        if (data === 0) console.log('Exito: Tarjeta guardada correctamente en el servidor.');
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error('Error: No se pudo guardar la tarjeta en el servidor.');
        console.error(xhr);
    }).always(function () {
        if (callback !== null) {
            callback();
        }
    });
}

/**
 * Regresa la descripcion de las Lonas
 */
export function getLonasDescription(orderName) {
    let lonas_description = "";
    let lonas = localStorage.getItem('lonas_' + orderName);
    if (lonas !== '' && lonas !== null) {
        lonas = JSON.parse(lonas);
        if (lonas.length > 0) {
            lonas_description += "&Lonas#Detalles lonas:\n\n";
            lonas.forEach((lona) => {
                lonas_description += lona[1] + " " + lona[2] + " Base: " + lona[3] + "cm Altura: " + lona[4] + "cm\n\n";
            });
        }
    }
    return lonas_description;
}

/**
 * Devuelve la fecha actual en el formato **yyyy-mm-dd**.
 */
export function getCurrentDate(now = new Date()) {
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    
    return year + "-" + month + "-" + day;
}