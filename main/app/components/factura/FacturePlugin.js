import './style-facture.css';
import Swal from 'sweetalert2';

let active;
let response;
let data;
let _client;

function toggleClass() { // indica si cambiamos entre facturar o no facturar
    active = !active;
    console.log('active:', active);
    $('#btnFact').toggleClass('active inactive');
    $('#btnNoFact').toggleClass('active inactive');
}

function updateOrderComment(active, comment) { // manejo de comentarios en las ordenes
    let str = comment.replace('&Facturado', '');
    if (active) {
        Poster.orders.setOrderComment(data.order.id, str + '&Facturado');
    } else {
        Poster.orders.setOrderComment(data.order.id, str);
    }
}

function showChangeNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok'
    }).then((result) => {
        if (result.value) {
            if (type === 'success' || needclose === true) Poster.interface.closePopup();
        }
    });
}

function aplicarCambios() {
    localStorage.setItem('active', active);

    if (active) {
        localStorage.setItem('clientRFC', $('select[id=selectRFC] option:selected').text());
        localStorage.setItem('clientName', $('#txtName').val());
        localStorage.setItem('clientPhone', $('#txtTelefono').val());
        localStorage.setItem('clientAddress', $('#txtAddress').val());
        localStorage.setItem('clientEmail', $('#txtEmail').val());
        localStorage.setItem('clientTarjeta', $('select[id=selectTarjeta] option:selected').text());
        localStorage.setItem('clientCFDI', $('select[id=selectCFDI] option:selected').val() + '-' + $('select[id=selectCFDI] option:selected').text());
        localStorage.setItem('clientObservations', $('#facturaObservaciones').val());
    } else {
        localStorage.setItem('clientRFC', '');
        localStorage.setItem('clientName', '');
        localStorage.setItem('clientPhone', '');
        localStorage.setItem('clientAddress', '');
        localStorage.setItem('clientEmail', '');
        localStorage.setItem('clientTarjeta', '');
        localStorage.setItem('clientCFDI', '');
        localStorage.setItem('clientObservations', '');
    }

    Poster.orders.getActive()
        .then(function (order) {
            updateOrderComment(active, order.order.comment);
            if (active) {
                showChangeNotification('success', 'Facturación Activada', 'Esta orden será procesada para facturar.');
            } else {
                showChangeNotification('info', 'Facturación Desactivada', 'Esta orden NO será procesada para facturar.', true);
            }
        });
}

function checkActive() {
    active = (localStorage.getItem('active') === 'true');
    console.log('active in fact:', active);
    if (active) {
        $("#btnFact").attr('class', 'active');
        $("#btnNoFact").attr('class', 'inactive');
    } else {
        $("#btnFact").attr('class', 'inactive');
        $("#btnNoFact").attr('class', 'active');
    }
}

function checkClientRFC(clientId) {
    Poster.makeRequest('url/get_rfc_client.php', {
        headers: [],
        method: 'POST',
        data: {
            clientId: clientId
        },
        timeout: 10000
    }, (answer) => {
        console.log('json mod answer: ', JSON.parse(answer.result));

        $('#loader').hide();

        if (answer && Number(answer.code) === 200) {
            let jsonResponse = JSON.parse(answer.result);

            if (jsonResponse.length !== 0) {
                $('#rfc-loaded').show();
                response = jsonResponse;
                fillSelect();
                showInfoClient();
            } else {
                $('#rfc-no-loaded').show();
            }
        } else {
            showChangeNotification('error', '¡Sin conexión!', 'No se ha recibido ninguna respuesta del servidor. Intente de nuevo.', true);
        }
    });

    Poster.clients.get(clientId).then((client) => {
        if (!client) {
            return;
        }
        console.log('datos cliente:', client);
        _client = client;
        $('#txtTelefono').val(client.phone);
        $('#txtEmail').val(client.email);
    });
}

function fillSelect() {
    let select = $('#selectRFC').get(0);
    while (select.firstChild) select.removeChild(select.firstChild);
    for (let i = 0; i < response.length; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = response[i].client_rfc;
        select.appendChild(opt);
    }
}

function showInfoClient() {
    let index = $('select[id=selectRFC]').val();
    //console.log($('select[id=selectRFC] option:selected').text());
    //console.log('showInfoClient', response[index]);
    $('#txtName').val(response[index].client_name);
    $('#txtAddress').val(response[index].client_address);
}

function darAltaRFC() {

    $('#btnAltaRFC').prop('disabled', true);

    let rfc = $("#altaRFC").val().trim();

    if (rfc.length < 12 || rfc.length > 13) {
        showChangeNotification('error', '¡RFC inválido!', 'Verifiquelo por favor.');
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    if ($('#altaName').val().trim() === '') {
        showChangeNotification('error', '¡Razón Social no proporcionada!', 'Verifiquelo por favor.');
        $('#btnAltaRFC').prop('disabled', false);
        return;
    }

    updateClientInfo();

    Poster.makeRequest('url/alta_cliente.php', {
        headers: [],
        method: 'POST',
        data: {
            clientRFC: $('#altaRFC').val(),
            clientId: _client.id,
            clientName: $('#altaName').val(),
            clientAddress: $('#altaAddress').val()
        },
        timeout: 10000
    }, (answer) => {
        console.log('mod answer: ', answer);
        let result = Number(answer.result);
        switch (result) {
            case 0:
                $('#btnAltaRFC').prop('disabled', false);
                showChangeNotification('success', '¡Alta exitosa!', 'El RFC ha sido vinculado con éxito a este cliente.');
                break;
            case -1:
                showChangeNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
                break;
            case -2:
                showChangeNotification('error', '¡RFC duplicado!', 'El RFC ingresado ya está vinculado a este cliente.')
                break;
            default:
                showChangeNotification('error', '¡Un error ha ocurrido!', 'Por favor, intente de nuevo.');
        }
        $('#btnAltaRFC').prop('disabled', false);
    });
}

//************************************************/
// Función para validar un RFC
// Devuelve el RFC sin espacios ni guiones si es correcto
// Devuelve false si es inválido
// (debe estar en mayúsculas, guiones y espacios intermedios opcionales)
function rfcValido(rfc, aceptarGenerico = true) {
    const re = /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/;
    var validado = rfc.match(re);

    if (!validado)  // Coincide con el formato general del regex?
        return false;

    // Separar el dígito verificador del resto del RFC
    const digitoVerificador = validado.pop(),
        rfcSinDigito = validado.slice(1).join(''),
        len = rfcSinDigito.length,

        // Obtener el digito esperado
        diccionario = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ",
        indice = len + 1;
    var suma,
        digitoEsperado;

    if (len == 12) suma = 0
    else suma = 481; // Ajuste para persona moral

    for (var i = 0; i < len; i++)
        suma += diccionario.indexOf(rfcSinDigito.charAt(i)) * (indice - i);
    digitoEsperado = 11 - suma % 11;
    if (digitoEsperado == 11) digitoEsperado = 0;
    else if (digitoEsperado == 10) digitoEsperado = "A";

    // El dígito verificador coincide con el esperado?
    // o es un RFC Genérico (ventas a público general)?
    if ((digitoVerificador != digitoEsperado)
        && (!aceptarGenerico || rfcSinDigito + digitoVerificador != "XAXX010101000"))
        return false;
    else if (!aceptarGenerico && rfcSinDigito + digitoVerificador == "XEXX010101000")
        return false;
    return rfcSinDigito + digitoVerificador;
}
//**************************************************/

function validarRFC() {
    let input = $("#altaRFC").val();
    let rfc = input.trim().toUpperCase();
    $("#altaRFC").val(rfc);

    if (input.length < 12 || input.length > 13) {
        $("#divRFC").attr('class', 'has-error');
        $("#spanIcon").text('⛔');
        return;
    }

    let rfcCorrecto = rfcValido(rfc);

    if (rfcCorrecto) {
        $("#divRFC").attr('class', 'has-success');
        $("#spanIcon").text('✔️');
    } else {
        $("#divRFC").attr('class', 'has-warning');
        $("#spanIcon").text('⚠️');
    }
}

function validarRazonSocial() {
    let input = $("#altaName").val();
    let razonSocial = input.trim();
    $("#altaName").val(razonSocial);

    if (razonSocial === '') {
        $("#divRazon").attr('class', 'has-error');
        $("#spanIconName").text('⛔');
        return;
    } else {
        $("#divRazon").attr('class', 'has-success');
        $("#spanIconName").text('✔️');
    }
}

function checkboxChange() {
    if ($('#checkbox').is(':checked')) {
        $('#altaTel').prop('readonly', false);
        $('#altaEmail').prop('readonly', false);
    } else {
        $('#altaTel').prop('readonly', true);
        $('#altaEmail').prop('readonly', true);
    }
}

function updateClientInfo() {
    if ($('#checkbox').is(':checked')) {
        if ($('#altaTel').val() !== '' || $('#altaEmail').val() !== '') {
            Poster.makeApiRequest('clients.updateClient', {
                method: 'post',
                data: {
                    client_id: _client.id,
                    phone: $('#altaTel').val(),
                    email: $('#altaEmail').val()
                },
            }, (result) => {
                console.log('result update client: ', result);
                if (result !== _client.id) {
                    showChangeNotification('info', 'Oops...', 'No se pudo actualizar la información del cliente en Poster');
                }
            });
        }
    }
}

function showViewAlta() {
    //$('#altaName').val(_client.lastname + " " + _client.firstname);
    $('#altaAddress').val(_client.address);
    $('#altaTel').val(_client.phone);
    $('#altaEmail').val(_client.email);

    $('#rfc-no-loaded').hide();
    $('#rfc-loaded').hide();
    $('#alta-rfc').show();
}

function init() {
    $('#loader').show();
    $('#rfc-loaded').hide();
    $('#alta-rfc').hide();
    $('#rfc-no-loaded').hide();

    $('#txtName').val('');
    $('#txtAddress').val('');

    $('select[id=selectTarjeta]').val('1');
    $('select[id=selectCFDI]').val('G03');

    // seccion del alta de rfc
    $('#spanIcon').text('@');
    $('#altaRFC').val('');
    $('#altaName').val('');
    $('#altaAddress').val('');
    $('#altaTel').val('');
    $('#altaEmail').val('');
    $('#altaTel').prop('readonly', true);
    $('#altaEmail').prop('readonly', true);
    $('#checkbox').prop("checked", false);
    $('#divRFC').removeClass('has-success has-warning has-error');
}

/**
 * @deprecated
 */
export default class FacturePlugin extends React.Component {
    constructor(props) {
        super(props);
        checkActive();
    }

    render() {
        data = this.props.data;
        console.log('data desde facture:', data);
        init();
        checkActive();
        checkClientRFC(data.order.clientId);
        return (
            <div className='facture-plugin'>
                <div className='scrollable-facture'>
                    <div className="loader-facture" id='loader' hidden={false}></div>

                    <div id='rfc-no-loaded' hidden={true}>
                        <h1>No hay información de facturación asociada a este cliente.</h1>
                        <br />
                        <button className='btn btn-default' onClick={showViewAlta}>Dar de alta</button>
                    </div>

                    <div id='alta-rfc' className='row' hidden={true}>
                        <div className='col-sm-5'>
                            <img src="url logo" alt="imagen" id='logo' className="img-circle img-responsive center-block" />
                        </div>
                        <div className='col-sm-6'>
                            <div className='alta-rfc form-group' id='divRFC'>
                                RFC:
                                <div className='input-group'>
                                    <span className="input-group-addon" id='spanIcon'>📄</span>
                                    <input type="text" className='form-control' defaultValue="" id="altaRFC" onBlur={validarRFC} placeholder="Obligatorio" />
                                </div>
                            </div>
                            <div className='alta-rfc fix-margin' id='divRazon'>
                                Razón social:
                                <div className='input-group'>
                                    <span className="input-group-addon" id='spanIconName'>👤</span>
                                    <input type="text" className='form-control' defaultValue="" id="altaName" onBlur={validarRazonSocial} placeholder="Obligatorio (Completo)" />
                                </div>
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Dirección:
                                <input type="text" defaultValue="" id="altaAddress" placeholder="Opcional" />
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Teléfono:
                                <input type="text" className='form-control' defaultValue="" id="altaTel" placeholder="Opcional" readOnly />
                            </div>
                            <div className='alta-rfc fix-margin'>
                                Email:
                                <input type="text" className='form-control' defaultValue="" id="altaEmail" placeholder="Opcional" readOnly />
                            </div>
                            <div className='alta-wrapper-btn'>
                                <button className="btn btn-green" id='btnAltaRFC' onClick={darAltaRFC} disabled={false}>¡Dar de alta RFC!</button>
                                <div className="checkbox">
                                    <label>
                                        <input type="checkbox" id='checkbox' onChange={checkboxChange} /> Actualizar Teléfono y Email.
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id='rfc-loaded' hidden={true}>
                        <div className='buttons-radio-group' onClick={toggleClass}>
                            <button className='inactive' id='btnFact'>Facturar</button>
                            <button className='active' id='btnNoFact'>No facturar</button>
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            RFC:
                            <select className='form-control' id='selectRFC' onChange={showInfoClient}></select>
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Razón social:
                            <input className='form-control' type='text' id='txtName' readOnly />
                            Teléfono:
                            <input className='form-control' type='text' id='txtTelefono' readOnly />
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Dirección:
                            <input className='form-control' type='text' id='txtAddress' readOnly />
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Email:
                            <input className='form-control' type='text' id='txtEmail' readOnly />
                        </div>
                        <br />
                        <div className="sub-wrapper-facture">
                            Tarjeta:
                            <select className="form-control" id="selectTarjeta">
                                <option value="1">No aplica</option>
                                <option value="2">Débito</option>
                                <option value="3">Crédito</option>
                            </select>
                        </div>
                        <br />
                        <div className='sub-wrapper-facture'>
                            Uso de CFDI:
                            <select className='form-control' id='selectCFDI'>
                                <option value='G03'>Gastos en general</option>
                                <option value='G01'>Adquisición de mercancias</option>
                                <option value='G02'>Devoluciones, descuentos o bonificaciones</option>
                                <option value='I01'>Construcciones</option>
                                <option value='I02'>Mobiliario y equipo de oficina</option>
                            </select>
                            Observaciones:
                            <textarea id="facturaObservaciones"></textarea>
                        </div>
                        <br />
                        <button className="btn btn-green" onClick={aplicarCambios}>Aplicar</button>
                        <button className="btn btn-primary" id='btnNuevoRFC' onClick={showViewAlta}>Dar Alta Nuevo RFC</button>
                    </div>
                </div>
            </div>
        );
    }
}