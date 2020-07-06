import Swal from 'sweetalert2';
import swal from 'sweetalert';

/**
 * Función para mostrar popups personalizados utilizando la librería sweetalert2
 * @param {String} type El tipo de modal a mostrar, puede ser **success**, **error**, **warning**, **info** o **question**.
 * @param {String} title El título del modal.
 * @param {String} text El mensaje a desplegar, ya sea texto plano o html. Cadena vacía por defecto.
 * @param {Boolean} needclose Si recibe **true**, cierra el popup de Poster abierto en ese momento al cerrar el modal. **false** por defecto.
 * @version 8.10.2 <- sweetalert2 version
 */
export function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        html: text,
        confirmButtonText: 'Ok',
        allowOutsideClick: false
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

/**
 * Función para mostrar popups personalizados utilizando la librería sweetalert
 * @param {String} type El tipo de modal a mostrar, puede ser **success**, **error**, **warning** o **info**.
 * @param {String} title El título del modal.
 * @param {String} text El mensaje a desplegar. Cadena vacía por defecto.
 * @version 2.0 <- sweetalert version
 */
export function showNotification_v1(type, title, text = '') {
    swal({
        title: title,
        text: text,
        icon: type,
        closeOnClickOutside: false
    });
}

/**
 * Envia una notificacion a traves de una orden online a la sucursal que procesara la orden de trabajo.
 * @param {Number | String} sucursal_notify El ID de la sucursal a notificar.
 * @param {String} comment_notify El comentario en la orden online. Debe ser el nombre de la tarjeta Trello.
 */
export function sendNotification(sucursal_notify, comment_notify) {
    console.log('MANDANDO NOTIFICACION');

    let data = {
        'spot_id': sucursal_notify,
        'client_id': 1727,
        'products': [{ 'product_id': 565, 'count': 1 }],
        'comment': comment_notify
    };

    if (Number(sucursal_notify) !== 5) { // No manda notificaciones a la sucursal de Matriz (5).
        Poster.makeApiRequest('incomingOrders.createIncomingOrder', {
            method: 'post',
            data: data
        }, (result) => {
            console.log(result);
        });
    }
}

/**
 * Verifica si tenemos la versión más reciente de los módulos.
 */
export function checkModulesVersion() {
    $.ajax({
        type: 'GET',
        url: 'url/poster_version.php',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('Versión ajax', data);
        let current_version = localStorage.getItem('version');
        current_version = current_version.split(' ');
        current_version = current_version[1];

        if (current_version !== data.version && !localStorage.getItem('version').includes('dev')) {
            //showNotification_v1('info', data.title + data.version, data.message);
            showNotification('info', data.title + data.version, data.message);
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        // error
    });
}

let Email = { send: function (a) { return new Promise(function (n, e) { a.nocache = Math.floor(1e6 * Math.random() + 1), a.Action = "Send"; var t = JSON.stringify(a); Email.ajaxPost("https://smtpjs.com/v3/smtpjs.aspx?", t, function (e) { n(e) }) }) }, ajaxPost: function (e, n, t) { var a = Email.createCORSRequest("POST", e); a.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), a.onload = function () { var e = a.responseText; null != t && t(e) }, a.send(n) }, ajax: function (e, n) { var t = Email.createCORSRequest("GET", e); t.onload = function () { var e = t.responseText; null != n && n(e) }, t.send() }, createCORSRequest: function (e, n) { var t = new XMLHttpRequest; return "withCredentials" in t ? t.open(e, n, !0) : "undefined" != typeof XDomainRequest ? (t = new XDomainRequest).open(e, n) : t = null, t } };
const email_config = require('../reporte/email.json');

/**
 * Envia un correo con un aviso de fallo y los datos que se estaban trabajando en ese momento.
 * @param {String} subject El asunto a notificar.
 * @param {String | Number} id_sucursal El ID de la sucursal.
 * @param {String} json_data Los datos que se estaban trabajando en ese momento.
 */
export function sendEmailNotification(subject, id_sucursal, json_data) {
    let sucursal = "";
    id_sucursal = parseInt(id_sucursal);

    switch (id_sucursal) {
        case 1:
            sucursal = "Terranorte";
            break;
        case 2:
            sucursal = "Caucel";
            break;
        case 5:
            sucursal = "Matriz";
            break;
        default:
            sucursal = "Sin nombre";
    }

    let message = "Sucursal: " + sucursal + ", data: " + json_data;

    $.ajax({
        type: 'POST',
        data: {
            subject: subject,
            message: message
        },
        url: 'url/Pos/enviar_email',
        dataType: 'json',
        encoded: true
    }).done(function (data) {
        console.log('Reporte enviado con éxito.');
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error('Error al enviar reporte.');
    });
}