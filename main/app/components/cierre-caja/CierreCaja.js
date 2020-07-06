import './style.css';
import '../reporte/report-loader.css';

import Swal from 'sweetalert2';
import { showNotification } from '../util/notifications';

let expected_cash = 0;
let num_payed_card = 0;
let num_payed_transfer = 0;

let asesor_name = "", asesor_id = 0;

let current_cash_shift_id = 0;

function testVideo() {
    let _html = '';
    _html += '<video id="pos-videos-tutos" width="800" height="600" controls>';
    _html += '<source src="url/dist/videos/busqueda_tickets_m.mp4" type="video/mp4">';
    _html += '</video>';

    Swal.fire({
        title: 'Aqui titulo',
        html: _html,
        grow: 'fullscreen',
        confirmButtonText: 'Ok',
        allowOutsideClick: false
    }).then((result) => {

    });
}

/**
 * Inicializacion.
 */
function init() {
    expected_cash = 0;
    num_payed_card = 0;
    num_payed_transfer = 0;

    asesor_name = "";
    asesor_id = 0;

    current_cash_shift_id = 0;

    $('#cierre-loader').show();
    $('#cierre-formulario').hide();
}

/**
 * Obtiene el id del cash shift abierto en la sucursal correspondiente.
 */
function getCurrentCashShiftID() {
    return new Promise(async resolve => {
        let now = new Date();

        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        let day = now.getDate();

        if (month < 10) {
            month = "0" + month;
        }

        if (day < 10) {
            day = "0" + day;
        }

        // obtener lista de cash shifts
        function getCashShift(year, month, day) {
            let dateFrom = year + "" + month + "" + day;
            return new Promise(resolve => {
                Poster.makeApiRequest('finance.getCashShifts?dateFrom=' + dateFrom + '&spot_id=' + Poster.settings.spotId, {
                    method: 'get'
                }, async (result) => {
                    if (result.length !== 0) {
                        let cash_shift_sucursal = result.find((item) => {
                            return item.spot_id === "" + Poster.settings.spotId && item.timeend === '0';
                        });

                        if (cash_shift_sucursal.length !== 0) {
                            resolve(cash_shift_sucursal);
                        } else {
                            month -= 1;
                            if (month < 10) month = "0" + month;
                            resolve(getCashShift(year, month, day));
                        }
                    } else {
                        month -= 1;
                        if (month < 10) month = "0" + month;
                        resolve(getCashShift(year, month, day));
                    }
                });
            });
        }

        let cash_shift = await getCashShift(year, month, day);

        resolve(cash_shift.cash_shift_id);
    });
}

/**
 * Crea una transaccion vacia para forzar el actualizado de la informacion en el shift propierties.
 * @param {Number} cash_shift_id 
 */
function forceCashShiftUpdate(cash_shift_id) {
    return new Promise(resolve => {
        // https://dev.joinposter.com/en/docs/v3/web/finance/createCashShiftTransaction
        let data = {
            cash_shift_id: cash_shift_id,
            type_id: 2,
            category_id: 4, // 4 - Adjustment en VP1 y VP
            user_id: 8, // 8 para VP | 6 para VP1
            amount: 0.0001,
            time: getTimeCashShift(true),
            comment: 'Force update cash shift'
        };

        Poster.makeApiRequest('finance.createCashShiftTransaction', {
            method: 'POST',
            data: data
        }, (result) => {
            resolve();
        });
    });
}

/**
 * Obtiene la fecha y hora en el formato **yyyy-mm-dd hh:mm** para usar con el cash shift.
 */
function getTimeCashShift(need_fix = false) {
    let date = new Date().toLocaleString();
    date = date.split(' ');

    let fecha = date[0];
    let tiempo = date[1];

    fecha = fecha.split('/');
    tiempo = tiempo.split(':');

    let dia = parseInt(fecha[0]);
    let mes = parseInt(fecha[1]);
    let anio = fecha[2];

    if (dia < 10) dia = "0" + dia;
    if (mes < 10) mes = "0" + mes;

    let hora = parseInt(tiempo[0]);
    let minuto = parseInt(tiempo[1]);
    if (need_fix) minuto -= 1;

    if (hora < 10) hora = "0" + hora;
    if (minuto < 10) minuto = "0" + minuto;

    let str_time = anio + "-" + mes + "-" + dia + " " + hora + ":" + minuto;

    return str_time;
}

/**
 * Obtiene los datos del cash shift actual.
 * @param {Number} cash_shift_id 
 */
function getCashShiftProps(cash_shift_id) {
    return new Promise(resolve => {
        Poster.makeApiRequest('finance.getCashShift?cash_shift_id=' + cash_shift_id, {
            method: 'get'
        }, (result) => {
            resolve(result);
        });
    });
}

/**
 * Obtiene todas las ventas del día.
 */
function getTransactions(_date_from) {
    return new Promise(resolve => {
        let date_from = getDateFormatted(_date_from);
        let date_to = getDateFormatted(new Date().toLocaleDateString());

        let query = '&timezone=client&include_products=false&type=spots&id=' + Poster.settings.spotId +
            '&status=2&date_from=' + date_from + '&date_to=' + date_to;

        Poster.makeApiRequest('dash.getTransactions?' + query, {
            method: 'GET'
        }, (result) => {
            resolve(result);
        });
    });
}

/**
 * Obtiene la fecha de Date().toLocaleDateString() en formato **yyyymmdd**.
 * @param {String} _date 
 */
function getDateFormatted(_date) {
    let date = _date;
    date = date.split('/');

    let dia = parseInt(date[0]);
    let mes = parseInt(date[1]);
    let anio = date[2];

    if (dia < 10) dia = "0" + dia;
    if (mes < 10) mes = "0" + mes;

    let fecha = "" + anio + mes + dia;

    return fecha;
}

/**
 * Calcula los datos que serviran para validar un cierre correcto de caja.
 */
async function calcularDatos() {
    await getDatosAsesor();
    current_cash_shift_id = await getCurrentCashShiftID();
    await forceCashShiftUpdate(current_cash_shift_id);
    let cash_shift = await getCashShiftProps(current_cash_shift_id);

    expected_cash = (cash_shift.amount_start + cash_shift.amount_sell_cash + cash_shift.amount_debit) / 100;
    expected_cash = parseFloat(expected_cash.toFixed(2));

    let ventas = await getTransactions(new Date(cash_shift.timestart).toLocaleDateString());

    for (let i = 0, len = ventas.length; i < len; i++) {
        if (Number(ventas[i].payed_card) > 0) num_payed_card += 1;
        let comment = ventas[i].transaction_comment === null ? '' : ventas[i].transaction_comment;
        if (comment.includes('&PT')) num_payed_transfer += 1;
    }

    $('#h3-cierre-asesor').text(asesor_name);
    $('#cierre-tarjetas').val(num_payed_card);
    $('#cierre-transfer').val(num_payed_transfer);

    $('#cierre-loader').hide();
    $('#cierre-formulario').show();
}

/**
 * Valida y procede con el cierre de caja.
 */
async function cerrarCaja() {
    let anyOpenTicket = await checkOpenTickets();

    if(anyOpenTicket){
        showNotification('error', 'Error', 'Tiene uno o más tickets abiertos. Por favor cierrelos e intente de nuevo.');
        return;
    }

    if ($('#cierre-efectivo').val() === '') {
        showNotification('error', 'Error', 'Campo de efectivo vacío.')
        return;
    }

    $('.btn-cierre').prop('disabled', true);
    let cierre_efectivo = parseFloat($('#cierre-efectivo').val());

    if (cierre_efectivo === expected_cash) {
        showProcesando();

        let datos = {
            cash_shift_id: parseInt(current_cash_shift_id),
            user_id: asesor_id,
            amount: cierre_efectivo,
            time: getTimeCashShift(),
            is_fiscal: 0,
            comment: $('#cierre-comment').val() + " #Empresa"
        };

        Poster.makeApiRequest('finance.closeCashShift', {
            method: 'post',
            data: datos
        }, (result) => {
            console.log('closeCashShift', result);
            if (result) {
                showNotification('success', 'Éxito', 'Cierre de caja correcto :)', true);
            } else {
                showNotification('error', 'Error', 'Error al intentar cerrar caja. Por favor, intente de nuevo.');
            }
            $('.btn-cierre').prop('disabled', false);
        });
    } else {
        showNotification('error', 'Valores incorrectos', 'El efectivo <b>$' + cierre_efectivo + '</b> no coincide con los <b>$' + expected_cash + '</b> esperados. Verifique su información.');
        $('.btn-cierre').prop('disabled', false);
    }
}

function checkOpenTickets() {
    return new Promise(resolve => {
        let query = '&timezone=client&include_products=false&type=spots&id=' + Poster.settings.spotId +
            '&status=1';

        Poster.makeApiRequest('dash.getTransactions?' + query, {
            method: 'GET'
        }, (result) => {
            if(result.length !== 0){
                resolve(true);
            }else{
                resolve(false);
            }
        });
    });
}

/**
 * Obtiene los datos del asesor.
 */
function getDatosAsesor() {
    return new Promise(resolve => {
        Poster.users.getActiveUser().then((user) => {
            if (!user) {
                asesor_name = "Sistemas Cierre";
                asesor_id = 8;
                return;
            }

            asesor_name = user.name;
            asesor_id = user.id;
            resolve();
        });
    });
}

function showProcesando() {
    Swal.fire({
        title: 'Procesando...',
        timer: 500,
        allowOutsideClick: false,
        onBeforeOpen: () => {
            Swal.showLoading();
            Swal.stopTimer();
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            showNotification('success', 'Listo :)', '', true);
        }
    });
}

export default class CierreCaja extends React.Component {
    constructor(props) {
        super(props)
        Poster.on('afterPopupClosed', () => {
            Swal.close();
            location.reload();
        });
    }

    render() {
        init();
        calcularDatos();
        return (
            <div className="viewCierreCaja">
                <div>
                    {/*<video width="320" height="240" controls>
                        <source src="url/dist/videos/busqueda_tickets.mp4" type="video/mp4" />
                        El navegador no soporta vídeo.
                    </video>*/}
                    {/*<button className="btns btn btn-success btn-func" onClick={testVideo} >Test video</button>*/}
                </div>
                <div id="cierre-loader" hidden={false}>
                    <div className="lds-facebook"><div></div><div></div><div></div></div>
                </div>
                <div id="cierre-formulario" hidden={true}>
                    <h2>Cierre de Caja</h2>
                    <div id="cierre-header">
                        <h3>Asesor:</h3>
                        <h3 id="h3-cierre-asesor"></h3>
                    </div>
                    <div>
                        <h3>Efectivo:</h3>
                        <input id="cierre-efectivo" className="form-control" type="number" placeholder="Venta + Pagos" />
                        <h3># de váuchers (comprobantes) por ventas con tarjeta:</h3>
                        <input id="cierre-tarjetas" className="form-control" type="number" readOnly />
                        <h3># de váuchers (comprobantes) por ventas con transferencia:</h3>
                        <input id="cierre-transfer" className="form-control" type="number" readOnly />
                        <h3>Comentario:</h3>
                        <input id="cierre-comment" className="form-control" type="text" />
                        {/*<div id="cierre-errores" hidden={true}>
                            <div id="cierre-alert-errores" className="alert alert-danger" role="alert">
                                Enter a valid email address
                            </div>
                        </div>*/}
                        <div id="cierre-botones">
                            <button className="btns btn btn-success btn-func btn-cierre" onClick={cerrarCaja} >Cerrar Caja</button>
                            <button className="btns btn btn-default btn-func btn-cierre" onClick={() => { Poster.interface.closePopup(); }} >Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}