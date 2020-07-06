import './style.css';
import Swal from 'sweetalert2';
import ErrorAviso from '../aviso/ErrorAviso';
import { toFixedTrunc } from '../util/number_format';
import { sendTrelloCardToServer } from '../util/Util';
import { showNotification_v1 } from '../util/notifications';
import { sendNotification } from '../util/notifications';

let trelloKey = 'trello key';
let trelloToken = 'trello token';

let clientId;
let total = [];
let ticketStations = [];
let workStations = {};
let products = "";

let destinationList = [];
destinationList[1] = 'id list a'; //Terranorte
destinationList[2] = 'id list b'; //Caucel
destinationList[5] = 'id list c'; //Matriz

let listaTrabajosExternos = [];
listaTrabajosExternos[1] = 'id list d';
listaTrabajosExternos[2] = 'id list e';
listaTrabajosExternos[5] = 'id list f';

let sucursal_maquila_id = 0;
let crear_dos_tarjetas = false;

let datosTarjeta, datosArchivos;

let ticket_comment = "";

var sucursal_notify = 0;
var comment_notify = "";

/* function sendNotification() {
    console.log('MANDANDO NOTIFICACION');

    let data = {
        'spot_id': sucursal_notify,
        'client_id': 1727,
        'products': [{ 'product_id': 565, 'count': 1 }],
        'comment': comment_notify
    };

    if (sucursal_notify !== 5) {
        Poster.makeApiRequest('incomingOrders.createIncomingOrder', {
            method: 'post',
            data: data
        }, (result) => {
            console.log(result);
        });
    }
} */

function obtenerModificadorHorario() {
    let date = new Date();
    let dateUTC = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toUTCString();
    dateUTC = dateUTC.split(' ');
    console.log(dateUTC);
    console.log(dateUTC[4]);
    return dateUTC[4].replace(':00', '');
}

function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

function setTrello() { // se llama en el constructor del componente
    (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; }
        js = d.createElement(s); js.id = id;
        js.onload = function () {
            Trello.setToken(trelloToken);
            console.log("Success", "Trello Cargo");
        };
        js.src = "https://trello.com/1/client.js?key=" + trelloKey;
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'Trello'));
}

function autorizacion() {
    window.Trello.authorize({
        type: 'popup',
        name: 'Getting Started Application',
        scope: {
            read: 'true',
            write: 'true'
        },
        expiration: 'never',
        success: authenticationSuccess,
        error: authenticationFailure
    });
}

var authenticationSuccess = function () {
    console.log('Successful authentication');
    console.log('Token: ' + Trello.token());
};

var authenticationFailure = function () {
    console.log('Failed authentication');
};

async function mandarOrdenTrabajo() {
    await createCard();
    crear_dos_tarjetas = sucursal_maquila_id !== Poster.settings.spotId;
    if (crear_dos_tarjetas) await createCardExtern();
}

function createCard() {
    if ($('#deliverDate').val() === "") {
        showNotification_v1('info', 'Aviso', 'Tiene que establecer una fecha de entrega.');
        return;
    }
    if ($('#deliverTime').val() === "0") {
        showNotification_v1('info', 'Aviso', 'Tiene que establecer una hora de entrega.');
        return;
    }
    if ($('select[id=maquilaStation] option:selected').val() === '-1') {
        showNotification_v1('info', 'Aviso', 'Tiene que seleccionar la sucursal de maquila.');
        return;
    }
    if ($('select[id=deliverStation] option:selected').val() === '-1') {
        showNotification_v1('info', 'Aviso', 'Tiene que seleccionar la sucursal de entrega.');
        return;
    }

    return new Promise(resolve => {
        //autorizacion();
        datosTarjeta = {};
        datosArchivos = [];

        var creationSuccess = async function (data) {
            const myFiles = document.getElementById("file").files;
            console.log('Card created successfully.');
            let result_tarjeta = JSON.parse(JSON.stringify(data, null, 2));
            datosTarjeta.url = result_tarjeta.shortUrl;
            console.log(result_tarjeta);

            //sendNotification(sucursal_notify, comment_notify);

            if (myFiles.length != 0) {
                let porcentaje = 100 / myFiles.length;

                let html = `
                <div class="progress">
                    <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="<val>" aria-valuemin="0" aria-valuemax="100" style="width: <val>%">
                        <val>% Completo
                    </div>
                </div>
                <div class="lds-dual-ring"></div>
            `;

                Swal.fire({
                    title: "Subiendo archivos a la orden de trabajo...",
                    html: html.replace(/<val>/g, 0),
                    timer: 1000,
                    allowOutsideClick: false,
                    onBeforeOpen: () => {
                        Swal.stopTimer();
                        Swal.disableConfirmButton();
                    }
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.timer) {
                        console.log('proceso terminado');
                        sendTrelloCardToServer(datosTarjeta, datosArchivos);
                        if (!crear_dos_tarjetas) showNotification('success', 'Éxito', 'Orden enviada con éxito.', true);
                    }
                });

                for (let i = 0; i < myFiles.length; i++) {
                    await createAndSendForm_v2(myFiles[i], data['id']);
                    Swal.update({ html: html.replace(/<val>/g, toFixedTrunc(porcentaje * (i + 1), 0)) });
                }
                Swal.resumeTimer();
            } else {
                sendTrelloCardToServer(datosTarjeta, datosArchivos);
                if (!crear_dos_tarjetas) showNotification('success', 'Éxito', 'Orden enviada con éxito.', true);
            }
            if (!crear_dos_tarjetas) $('#orderComments').val('');
            resolve();
        };

        var tickets = document.getElementById("clientTicket");
        var ticket = tickets.options[tickets.selectedIndex].innerHTML;
        var deliverStations = document.getElementById("deliverStation");
        var deliverStation = deliverStations.options[deliverStations.selectedIndex];
        var maquilaStations = document.getElementById("maquilaStation");
        var maquilaStation = maquilaStations.options[maquilaStations.selectedIndex];
        var clientName = document.getElementById("clientName");
        var clientPhone = document.getElementById("clientPhone");
        var clientMail = document.getElementById("clientMail");
        var station = document.getElementById("orderStation");
        var orderReceptionist = document.getElementById("orderReceptionist");
        var orderComments = document.getElementById("orderComments");
        var dueDate = document.getElementById("deliverDate");
        var Times = document.getElementById("deliverTime");
        var time = Times.options[Times.selectedIndex];
        if (time.value < 10) {
            time = "0" + time.value;
        } else {
            time = time.value;
        }

        var orderDescription = "";
        orderDescription += "Cliente: " + clientName.value + "\n";
        orderDescription += "Telefono: " + clientPhone.value + "\n";
        orderDescription += "Correo: " + clientMail.value + "\n\n";
        orderDescription += "Sucursal de venta: " + station.value + "\n";
        orderDescription += "Sucursal de produccion: " + maquilaStation.innerHTML + "\n";
        orderDescription += "Sucursal de entrega: " + deliverStation.innerHTML + "\n";
        orderDescription += "Asesor: " + orderReceptionist.value + "\n";
        orderDescription += "Comentarios: " + orderComments.value + "\n\n";
        orderDescription += products;
        if (ticket_comment !== "") {
            orderDescription += "\n\n" + ticket_comment;
        }

        datosTarjeta.cliente = clientName.value;
        datosTarjeta.telefono = clientPhone.value;
        datosTarjeta.email = clientMail.value;
        datosTarjeta.solicita = station.value;
        datosTarjeta.produce = maquilaStation.innerHTML;
        datosTarjeta.entrega = deliverStation.innerHTML;
        datosTarjeta.asesor = orderReceptionist.value;
        if (ticket_comment !== "") {
            datosTarjeta.comentario = orderComments.value + "\n\n" + ticket_comment;
        } else {
            datosTarjeta.comentario = orderComments.value;
        }
        datosTarjeta.productos = products;

        console.log(ticket);

        sucursal_maquila_id = parseInt(maquilaStation.value);

        var newCard = {
            name: clientName.value + "- OT - " + ticket + " / " + dueDate.value + " " + time + ':00',
            desc: orderDescription,
            idList: destinationList[maquilaStation.value],
            pos: 'top',
            due: dueDate.value + 'T' + time + ':00:00-' + obtenerModificadorHorario()
        };

        // establecemos datos a notificar en la sucursal de produccion
        sucursal_notify = $('select[id=maquilaStation] option:selected').val();
        comment_notify = newCard.name;

        datosTarjeta.ticket = ticket;
        datosTarjeta.fecha_entrega = dueDate.value;
        datosTarjeta.hora_entrega = time;

        window.Trello.post('/cards/', newCard, creationSuccess);
    });
}

function createCardExtern() {
    if ($('#deliverDate').val() === "") {
        showNotification_v1('info', 'Aviso', 'Tiene que establecer una fecha de entrega.');
        return;
    }
    if ($('#deliverTime').val() === "0") {
        showNotification_v1('info', 'Aviso', 'Tiene que establecer una hora de entrega.');
        return;
    }
    if ($('select[id=maquilaStation] option:selected').val() === '-1') {
        showNotification_v1('info', 'Aviso', 'Tiene que seleccionar la sucursal de maquila.');
        return;
    }
    if ($('select[id=deliverStation] option:selected').val() === '-1') {
        showNotification_v1('info', 'Aviso', 'Tiene que seleccionar la sucursal de entrega.');
        return;
    }

    return new Promise(resolve => {
        //autorizacion();
        datosTarjeta = {};
        datosArchivos = [];

        var creationSuccess = async function (data) {
            const myFiles = document.getElementById("file").files;
            console.log('Card created successfully.');
            let result_tarjeta = JSON.parse(JSON.stringify(data, null, 2));
            datosTarjeta.url = result_tarjeta.shortUrl;
            console.log(result_tarjeta);

            //sendNotification(sucursal_notify, comment_notify);

            if (myFiles.length != 0) {
                let porcentaje = 100 / myFiles.length;

                let html = `
                <div class="progress">
                    <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="<val>" aria-valuemin="0" aria-valuemax="100" style="width: <val>%">
                        <val>% Completo
                    </div>
                </div>
                <div class="lds-dual-ring"></div>
            `;

                Swal.fire({
                    title: "Subiendo archivos a la orden de trabajo...",
                    html: html.replace(/<val>/g, 0),
                    timer: 1000,
                    allowOutsideClick: false,
                    onBeforeOpen: () => {
                        Swal.stopTimer();
                        Swal.disableConfirmButton();
                    }
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.timer) {
                        console.log('proceso terminado');
                        showNotification('success', 'Éxito', 'Orden enviada con éxito.', true);
                    }
                });

                for (let i = 0; i < myFiles.length; i++) {
                    await createAndSendForm_v2(myFiles[i], data['id']);
                    Swal.update({ html: html.replace(/<val>/g, toFixedTrunc(porcentaje * (i + 1), 0)) });
                }
                Swal.resumeTimer();
            } else {
                showNotification('success', 'Éxito', 'Orden enviada con éxito.', true);
            }
            $('#orderComments').val('');
            resolve();
        };

        var tickets = document.getElementById("clientTicket");
        var ticket = tickets.options[tickets.selectedIndex].innerHTML;
        var deliverStations = document.getElementById("deliverStation");
        var deliverStation = deliverStations.options[deliverStations.selectedIndex];
        var maquilaStations = document.getElementById("maquilaStation");
        var maquilaStation = maquilaStations.options[maquilaStations.selectedIndex];
        var clientName = document.getElementById("clientName");
        var clientPhone = document.getElementById("clientPhone");
        var clientMail = document.getElementById("clientMail");
        var station = document.getElementById("orderStation");
        var orderReceptionist = document.getElementById("orderReceptionist");
        var orderComments = document.getElementById("orderComments");
        var dueDate = document.getElementById("deliverDate");
        var Times = document.getElementById("deliverTime");
        var time = Times.options[Times.selectedIndex];
        if (time.value < 10) {
            time = "0" + time.value;
        } else {
            time = time.value;
        }

        var orderDescription = "";
        orderDescription += "Cliente: " + clientName.value + "\n";
        orderDescription += "Telefono: " + clientPhone.value + "\n";
        orderDescription += "Correo: " + clientMail.value + "\n\n";
        orderDescription += "Sucursal de venta: " + station.value + "\n";
        orderDescription += "Sucursal de produccion: " + maquilaStation.innerHTML + "\n";
        orderDescription += "Sucursal de entrega: " + deliverStation.innerHTML + "\n";
        orderDescription += "Asesor: " + orderReceptionist.value + "\n";
        orderDescription += "Comentarios: " + orderComments.value + "\n\n";
        orderDescription += products;
        if (ticket_comment !== "") {
            orderDescription += "\n\n" + ticket_comment;
        }

        datosTarjeta.cliente = clientName.value;
        datosTarjeta.telefono = clientPhone.value;
        datosTarjeta.email = clientMail.value;
        datosTarjeta.solicita = station.value;
        datosTarjeta.produce = maquilaStation.innerHTML;
        datosTarjeta.entrega = deliverStation.innerHTML;
        datosTarjeta.asesor = orderReceptionist.value;
        if (ticket_comment !== "") {
            datosTarjeta.comentario = orderComments.value + "\n\n" + ticket_comment;
        } else {
            datosTarjeta.comentario = orderComments.value;
        }
        datosTarjeta.productos = products;

        console.log(ticket);

        sucursal_maquila_id = parseInt(maquilaStation.value);

        var newCard = {
            name: clientName.value + "- OT - " + ticket + " / " + dueDate.value + " " + time + ':00',
            desc: orderDescription,
            idList: listaTrabajosExternos[Poster.settings.spotId],
            pos: 'top',
            due: dueDate.value + 'T' + time + ':00:00-' + obtenerModificadorHorario()
        };

        // establecemos datos a notificar en la sucursal de produccion
        sucursal_notify = $('select[id=maquilaStation] option:selected').val();
        comment_notify = newCard.name;

        datosTarjeta.ticket = ticket;
        datosTarjeta.fecha_entrega = dueDate.value;
        datosTarjeta.hora_entrega = time;

        window.Trello.post('/cards/', newCard, creationSuccess);
    });
}

const createAndSendForm = function (file, cardId) {
    var formData = new FormData();
    formData.append("key", trelloKey);
    formData.append("token", trelloToken);
    formData.append("file", file);
    formData.append("name", file.name);
    var request = createRequest(cardId);
    request.send(formData);
};

const createRequest = function (cardId) {
    var request = new XMLHttpRequest();
    request.responseType = "json";
    request.onreadystatechange = function () {
        // When we have a response back from the server we want to share it!
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/response
        if (request.readyState === 4) {
            console.log('Successfully uploaded at:' + JSON.stringify(request.response));
        }
    }
    request.open("POST", 'https://api.trello.com/1/cards/' + cardId + '/attachments/');
    return request;
};

/**
 * Envia un archivo para adjuntar a una tarjeta Trello.
 * @param {File} file El archivo a adjuntar.
 * @param {Number} cardId El ID de la tarjeta Trello.
 */
async function createAndSendForm_v2(file, cardId) {
    return new Promise(resolve => {
        let formData = new FormData();
        formData.append("key", trelloKey);
        formData.append("token", trelloToken);
        formData.append("file", file);
        formData.append("name", file.name);
        //let request = createRequest(cardId);
        let request = new XMLHttpRequest();
        request.responseType = "json";
        request.onreadystatechange = function () {
            // When we have a response back from the server we want to share it!
            // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/response
            if (request.readyState === 4) {
                //console.log('Successfully uploaded at:' + JSON.stringify(request.response));
                let result = JSON.parse(JSON.stringify(request.response, null, 2));
                console.log(result);
                datosArchivos.push([result.name, result.url]);
                resolve(JSON.stringify(request.response));
            }
        }
        request.open("POST", 'https://api.trello.com/1/cards/' + cardId + '/attachments/');
        request.send(formData);
    });
}

function getWorkStations() {
    Poster.makeApiRequest('access.getSpots', {
        method: 'get'
    }, (stations) => {
        fillStationSelector('deliverStation', stations);
        fillStationSelector('maquilaStation', stations);
    });
}

function fillStationSelector(name, stations) {
    let select = document.getElementById(name);
    while (select.firstChild) select.removeChild(select.firstChild);

    let opt_default = document.createElement('option');
    opt_default.value = "-1";
    opt_default.innerHTML = "Seleccione una opción";
    select.appendChild(opt_default);

    let length = stations.length;
    for (let i = 0; i < length; i++) {
        workStations[stations[i].spot_id] = stations[i].spot_name;

        let opt = document.createElement('option');
        opt.value = stations[i].spot_id;
        opt.innerHTML = stations[i].spot_name;
        select.appendChild(opt);
    }
}

function getReceptionist() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }
        $('#orderReceptionist').val(user.name);
    });
}

function getClientInfo() {
    Poster.makeApiRequest('clients.getClient?&client_id=' + clientId, {
        method: 'get'
    }, (client) => {
        console.log('cliente:', client);
        if (client) {
            $('#clientName').val(client[0].firstname + " " + client[0].lastname);
            $('#clientPhone').val(client[0].phone);
            $('#clientMail').val(client[0].email);
            setViewDefaultData();
        }
    });
    getClientTickets();
}

function getClientTickets(startDate = getDateString(1), endDate = getDateString(1)) {
    let ticketSelector = document.getElementById("clientTicket");
    let sendButton = document.getElementById("sendButton");

    if (ticketSelector !== null) {
        ticketSelector.disabled = true;
    }
    if (sendButton !== null) {
        sendButton.disabled = true;
    }


    Poster.makeApiRequest('dash.getTransactions?&timezone=client&dateFrom=' + startDate + '&dateTo=' + endDate + '&type=clients&id=' + clientId + '&status=2', {
        method: 'get'
    }, (tickets) => {
        console.log('tickets:', tickets);

        let select = document.getElementById('clientTicket');
        let button = document.getElementById("sendButton");
        while (select.firstChild) select.removeChild(select.firstChild);
        let length = tickets.length;
        total = [];
        ticketStations = [];

        for (let i = 0; i < length; i++) {

            let opt = document.createElement('option');
            opt.value = i;
            opt.innerHTML = tickets[i].transaction_id;
            total.push(tickets[i].sum);
            ticketStations.push(tickets[i].spot_id);
            select.appendChild(opt);
        }
        $('select[id=clientTicket]').val(0).trigger('change');
        select.disabled = false;
        button.disabled = false;
        getTicketInfo();
    });
}

function getClientTicketsByDate() {
    var startDateInput = document.getElementById("startDate");
    var endDateInput = document.getElementById("endDate");

    var startDate = new Date(startDateInput.value);
    var endDate = new Date(endDateInput.value);

    startDate = getDateString(1, startDate);
    endDate = getDateString(1, endDate);

    //console.log("Fecha del input de inicio: "+getDateString(1,startDate));
    getClientTickets(startDate, endDate);
}

function getTicketInfo() {
    console.log('totals:', total);

    var tickets = document.getElementById("clientTicket");
    if (tickets.options[tickets.selectedIndex] === undefined) {
        return;
    }
    var ticket = tickets.options[tickets.selectedIndex];

    $('#ticketTotal').val(total[ticket.value] / 100);
    $('#orderStation').val(workStations[ticketStations[ticket.value]]);

    getTicketProducts(ticket.innerHTML);
    getTicketComment(ticket.innerHTML);
}

function getTicketProducts(ticket) {
    Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + ticket, {
        method: 'get'
    }, (productList) => {
        products = "Productos: \n";
        console.log("productos: ", productList);
        let length = productList.length;
        let modification;

        for (let i = 0; i < length; i++) {
            if (productList[i].modificator_name != null) {
                modification = " " + productList[i].modificator_name;
            } else {
                modification = '';
            }
            products += "**" + parseInt(productList[i].num) + "** | " + productList[i].product_name + modification + "\n";
        }

        let productSpan = document.getElementById("productList");
        productSpan.textContent = products;
    });
}

function getTicketComment(ticket) {
    ticket_comment = "";
    let query = "&transaction_id=" + ticket;
    query += "&include_history=false";
    query += "&include_products=false";
    query += "&timezone=client";

    Poster.makeApiRequest('dash.getTransaction?' + query, {
        method: 'get'
    }, (result) => {
        console.log('TICKET DATA:', result);
        let comment = result[0].transaction_comment;
        if (comment !== "" && comment !== null && comment !== undefined) {
            if (comment.includes('&Lonas')) {
                let tags = comment.split('&');
                for (let i = 0, len = tags.length; i < len; i++) {
                    if (tags[i].includes('Lonas#')) {
                        let strings = tags[i].split('#');
                        ticket_comment = strings[1];
                        break;
                    }
                }
            }
        }
        console.log(ticket_comment);
    });
}

function setViewDefaultData() {
    var date = getDateString();

    var deliverDate = document.getElementById("deliverDate");
    var startDate = document.getElementById("startDate");
    var endDate = document.getElementById("endDate");
    deliverDate.value = "";
    startDate.value = date;
    endDate.value = date;
}

function getDateString(type = 0, now = new Date()) {
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }
    if (type == 0) {
        return year + "-" + month + "-" + day;
    } else {
        return year + "" + month + "" + day;
    }

}

export default class WorkOrder extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        clientId = this.props.clientId;
        if (clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        getReceptionist();
        getWorkStations();
        getClientInfo();
        setTrello();

        return (
            <div>
                <section id="clientInfo" className="row form-group">
                    <div className="col-sm-12" id="divClientInfo">
                        <div id="divCategories">
                            <p className="textoWO">Cliente:</p>
                            <input type="text" id='clientName' readOnly />
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Telefono:</p>
                            <input type="text" id="clientPhone" readOnly />
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">E-mail:</p>
                            <input type="text" id="clientMail" readOnly />
                        </div>
                    </div>
                    <div className="col-sm-12">
                        <div id="divCategories">
                            <p className="textoWO">Inicio:</p>
                            <input type="date" id="startDate" onChange={getClientTicketsByDate} />
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Fin:</p>
                            <input type="date" id="endDate" onChange={getClientTicketsByDate} />
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Ticket:</p>
                            <select className="form-control texto" onChange={getTicketInfo} id="clientTicket"></select>
                            <div className="tooltip">
                                📑
                                <span className="tooltiptext" id="productList"></span>
                            </div>
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Total:</p>
                            <input type="text" id="ticketTotal" readOnly />
                        </div>
                    </div>
                </section>
                <hr />
                <section id="orderInfo" className="row form-group">
                    <div className="col-sm-12" id="divOrderInfoP1">
                        <div id="divCategories">
                            <p className="textoWO">Sucursal de venta:</p>
                            <input type="text" id="orderStation" readOnly />
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Fecha de entrega:</p>
                            <input type="date" id="deliverDate" />
                        </div>
                    </div>

                    <div className="col-sm-12">
                        <div id="divCategories">
                            <p className="textoWO">Hora de entrega:</p>
                            <select className="form-control texto" id="deliverTime">
                                <option value="0">Seleccione</option>
                                <option value="8">08:00</option>
                                <option value="9">09:00</option>
                                <option value="10">10:00</option>
                                <option value="11">11:00</option>
                                <option value="12">12:00</option>
                                <option value="13">13:00</option>
                                <option value="14">14:00</option>
                                <option value="15">15:00</option>
                                <option value="16">16:00</option>
                                <option value="17">17:00</option>
                                <option value="18">18:00</option>
                                <option value="19">19:00</option>
                                <option value="20">20:00</option>
                            </select>
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Sucursal de maquila:</p>
                            <select className="form-control texto" id="maquilaStation"></select>
                        </div>
                        <div id="divCategories">
                            <p className="textoWO">Sucursal de entrega:</p>
                            <select className="form-control texto" id="deliverStation"></select>
                        </div>
                    </div>
                </section>
                <section id="orderDetails" className="row form-group">
                    <div id="divCategories" className="col-sm-5">
                        <p className="texto">Asesor:</p>
                        <input type="text" id="orderReceptionist" readOnly />
                    </div>
                    <div id="divCategories">
                        <p className="texto">Comentarios:</p>
                        <textarea id="orderComments"></textarea>
                    </div>
                </section>
                <hr />
                <br />
                <section id="orderActions">
                    <div id="divCategories">
                        <label for="token">File:</label>
                        <input type="file" multiple id="file" />
                        <button className="btn btn-green" onClick={mandarOrdenTrabajo} id="sendButton">Enviar</button>
                    </div>
                </section>
            </div>

        );
    }
}