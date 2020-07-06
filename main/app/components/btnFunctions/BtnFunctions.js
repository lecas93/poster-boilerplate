import './style.css';

import ClientManager from '../client-manager/ClientManager';
import FactureAfterPlugin from '../factura/FactureAfterPlugin';
import Requisiciones from '../requisicion/Requisiciones';
import Requisicion from '../requisicion/Requisicion';
import Recepcion from '../requisicion/Recepcion';
import OrdenTrabajo from '../orden-trabajo/WorkOrder';
import ManejarOrden from '../orden-trabajo/OrderManage';
import CreditoPendientes from '../venta-credito/CreditoPendientes';
import AnticipoPendientes from '../anticipo/AnticipoPendientes';
import AdeudosManager from '../util/AdeudosManager/AdeudosManager';
import Tickets from '../tickets/Tickets';
import CierreCaja from '../cierre-caja/CierreCaja';
import { checkModulesVersion } from '../util/notifications';
import Swal from 'sweetalert2';
import ContadorImpresiones from '../contador-impresiones/ContadorImpresiones';

const CREDIT_GROUP = Number(localStorage.getItem('credit_group_id'));

let View = null;

let clientId = 0;
let solicitante;
let empleados;

function showTest() {
    let products = [ //El producto aviso en sistema 565
        {
            product_id: 904,
            count: 1
        }
    ];
    Poster.makeApiRequest('incomingOrders.createIncomingOrder', {
        method: 'post',
        data: {
            spot_id: 1,
            client_id: 4,
            products: products,
            comment: 'Test'
        },
    }, (result) => {
        console.log('RESULT: ', result);
    });
}

/**
 * Verifica si el cliente pertenece al grupo de crédito.
 */
function checkEnableCredit() {
    Poster.clients.get(clientId).then((client) => {
        if (!client) {
            return;
        }

        if (client.groupId !== CREDIT_GROUP) {
            $('#btnCreditosPendientes').prop('disabled', true);
        } else {
            $('#btnCreditosPendientes').prop('disabled', false);
        }
    });
}

/**
 * Carga el componente seleccionado.
 * @param {Number} option El ID del componente.
 */
function showOption(option) {
    $("#viewFunctions").hide();
    switch (option) {
        case 1:
            View = <ClientManager clientId={this.props.clientId} />;
            break;
        case 2:
            View = <FactureAfterPlugin clientId={this.props.clientId} />;
            break;
        case 3:
            View = <Requisicion />;
            break;
        case 4:
            View = <OrdenTrabajo clientId={this.props.clientId} />;
            break;
        case 5:
            View = <CreditoPendientes clientId={this.props.clientId} />;
            break;
        case 6:
            View = <Recepcion />;
            break;
        case 7:
            View = <AnticipoPendientes clientId={this.props.clientId} />;
            break;
        case 8:
            View = <ManejarOrden clientId={this.props.clientId} />;
            break;
        case 9:
            View = <Requisiciones />;
            break;
        case 10:
            View = <Tickets />;
            break;
        case 11:
            View = <AdeudosManager clientId={this.props.clientId} />;
            break;
        case 12:
            View = <CierreCaja />;
            break;
        case 13:
            View = <ContadorImpresiones />;
            break;
        default:
            // pass
    }
    this.setState();
    $("#viewFunctionsOption").show();
}

/**
 * Solicita la información del asesor activo.
 */
function getSolicitante() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }
        solicitante = user.name;
        getEmpleados();
    });
}

/**
 * Solicita la lista de empleados.
 */
function getEmpleados() {
    Poster.makeApiRequest('access.getEmployees', {
        method: 'get'
    }, (employees) => {
        empleados = employees;
        checkEnableRequisiciones();
    });
}

/**
 * Determina si un empleado puede acceder al componente para autorizar requisiciones.
 */
function checkEnableRequisiciones() {
    let i, n, employee, role;
    for (i = 0, n = empleados.length; i < n; i++) {
        employee = empleados[i];
        if (employee.name == solicitante) {
            role = employee.role_id;
            if (role == 5 || role == 6) {
                $('#btnRequisiciones').prop('disabled', false);
            }
            break;
        }
    }
}

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

function forceCashShiftUpdate(cash_shift_id) {
    return new Promise(resolve => {
        // https://dev.joinposter.com/en/docs/v3/web/finance/createCashShiftTransaction
        let data = {
            cash_shift_id: cash_shift_id,
            type_id: 2,
            category_id: 4,
            user_id: 6,
            amount: 0.0001,
            time: getTimeCashShift(),
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
function getTimeCashShift() {
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

    if (hora < 10) hora = "0" + hora;
    if (minuto < 10) minuto = "0" + minuto;

    let str_time = anio + "-" + mes + "-" + dia + " " + hora + ":" + minuto;

    return str_time;
}

// quitar saldo del ewallte de un cliente
function remove() {
    Poster.makeApiRequest('clients.addEWalletTransaction', {
        method: 'POST',
        data: {
            client_id: 477,
            amount: 2000
        }
    }, (result) => {
        console.log('RESULT:', result);
    });
}

$(document).on('click', '#btn-version-cerrar', () => { Swal.close(); });

function showVersionHistory() {
    let _history = '<button id="btn-version-cerrar" class="btns btn btn-primary">Cerrar</button>';

    _history += addVersionDetails('Versión 2.24.24', '09/03/2020',
    '<b>Nuevo:</b> Ahora se muestra una notificación si al cargar una cotización esta contiene un producto que ya ha sido eliminado.',
    '<b>Mejora: </b> Se ha mejorado el proceso interno de solicitudes de factura.');

    _history += addVersionDetails('Versión 2.24.23', '06/03/2020',
    '<b>Corrección:</b> Se había desactivado el envio de correos al solicitar facturas.');

    _history += addVersionDetails('Versión 2.24.22', '05/03/2020',
        '<b>Nuevo:</b> Al mandar a facturar, se valida que los tickets pertenezcan al cliente vinculado.',
        '<b>Nuevo:</b> Ahora se pueden crear alias para grupos de productos al generar una cotización.');

    _history += addVersionDetails('Versión 2.24.21', '24/02/2020',
        '<b>Corrección de bug:</b> Productos se duplican al regenerar la cotización si se sigue trabajando en la misma ventana.',
        '<b>Corrección de bug:</b> En <b>Cotizacion</b> el botón <b>Generar</b> no se ve bien en pantallas estrechas.');

    _history += addVersionDetails('Versión 2.24.20', '19/02/2020',
        '<b>Mantenimiento interno.</b>',
        '<b>Corrección de bug:</b> El descuento personal no se refleja en la cotización.');

    _history += addVersionDetails('Versión 2.24.19', '10/02/2020',
        '<b>Mantenimiento interno.</b>',
        '<b>Corrección de bugs con las fechas de busqueda en las cotizaciones.</b>',
        '<b>Nuevo:</b> Se agrega campos para descripciones a los productos en la cotización.');

    _history += addVersionDetails('Versión 2.24.18', '04/02/2020',
        '<b>Mantenimiento interno</b>',
        '<b>Corrección:</b> palabra "clave" por "clabe" en el formato de las cotizaciones.');

    _history += addVersionDetails('Versión 2.24.17', '09/01/2020',
        '<b>Mejora:</b> ahora se pueden eliminar tickets especificos antes de mandar a facturar.',
        '<b>Corrección de bug:</b> bloqueo de ordenes para antes de las 6pm se activaba para dias posteriores.');

    _history += addVersionDetails('Versión 2.24.15', '03/01/2020',
        '<b>Corrección de bug:</b> fecha desincronizada al intentar cerrar ventas.');

    _history += addVersionDetails('Versión 2.24.14', '31/12/2019',
        '<b>Corrección de bug:</b> bloqueo de venta se activaba con ordenes sin producción.');

    _history += addVersionDetails('Versión 2.24.13', '30/12/2019',
        'Se ha mejorado el manejo del <b>TAG</b> en las cotizaciones y las ventas.',
        'Se han agregado nuevas validaciones al hacer ventas a clientes a crédito.',
        'Se han agregado nuevas validaciones al momento de cerrar una venta.');

    _history += addVersionDetails('Versión 2.24.12', '13/12/2019',
        'Se agrega campo <b>TAG</b> a las cotizaciones.');

    _history += addVersionDetails('Versión 2.24.11', '11/12/2019',
        'Ahora la cotización guarda los precios de promociones',
        'Se agregaron a la cotización los campos personalizables: <b>días hábiles</b> y <b>condiciones</b>',
        'Fix internos menores');

    _history += addVersionDetails('Versión 2.24.10', '08/12/2019',
        '<b>Corrección de bug:</b> La generación de reportes en ciertos casos tardaba más de lo usual.');

    _history += addVersionDetails('Versión 2.24.9', '05/12/2019',
        '<b>Nueva función:</b> Ahora se podrá generar automáticamente el <b>documento de cotización</b> con base a los productos agregados en la orden. Así como también cargar directamente en la orden los productos de una cotización. <b>Funcionalidad añadida en las opciones extras de la orden.</b>',
        '<b>Nueva función:</b> Se ha agregado <b>cierre de caja personalizado</b>. Que ayudara con el conteo de efectivo al momento de cerrar caja. Se accede desde <b>Funciones Extras</b>.',
        '<b>Corrección de bug:</b> en la ventana de tickets no se seleccionaba la sucursal actual por defecto.',
        '<b>Corrección de bug:</b> los folios de merma salían como <b>undefined</b> al generar el corte de asesor si se accede desde el botón <b>Ya he registrado merma</b>.',
        'Ahora se puede ver el <b>historico de versiones</b> al hacer clic en el cuadro de versión.',
        'Se ha añadido un enlace a la página de documentación desde las opciones extras de la <b>Orden</b>.',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.24.8', '15/11/2019',
        'En <b>Pagos Pendientes</b> ahora también sale el nombre del cliente y la fecha de la venta en la tabla de adeudos.',
        'En <b>Pagos Pendientes</b> ahora también sale el adeudo total del cliente, cuanto ha cubierto de ese monto y el saldo pendiente a pagar.',
        'En <b>Pagos Pendientes</b> ahora los adeudos salen ordenados de forma descendente por fecha.');

    _history += addVersionDetails('Versión 2.24.7', '13/11/2019',
        'Al mandar una orden de trabajo externa, se genera una copia en el Trello local, en la lista <b>TRABAJOS EXTERNOS</b>');

    _history += addVersionDetails('Versión 2.24.5', '12/11/2019',
        'Ahora el efectivo de los pagos también contará para el cierre de caja.',
        'Ahora los tickets personalizados mostraran el nombre del asesor que abrio la venta en lugar del que lo cerró.',
        'Se ha agregado el botón <b>Regresar</b> en la ventana de <b>Pagos Pendientes</b>.');

    _history += addVersionDetails('Versión 2.23.2', '05/11/2019',
        'Ahora las ventas por transferencia <b>obligatoriamente</b> necesitan proporcionarle el comprobante para poder cerrar la venta.',
        'Se agrega componente para pagos pendientes por asesor',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.21.8', '12/10/2019',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.21.0', '24/09/2019',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.20.1', '17/09/2019',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.20.0', '11/09/2019',
        'Se agrega registro de folios de merma.',
        'Las ventas por transferencia ahora se guardan como cert para no afectar los montos de efectivo y tarjetas.',
        'Fixes internos menores.');

    _history += addVersionDetails('Versión 2.19', '17/08/2019',
        'Optimización al componente de las requisiciones.',
        'Optimizacion al componente de las ordenes de trabajo.',
        'Se agrega componente <b>historial de requisiciones</b>.',
        'Se agrega componente <b>Cotizador de lonas</b>.',
        'Se agrega funcionalidad para manejar requisiciones no autorizadas.',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 2.0', '14/05/2019',
        'Optimización al filtro de pagos pendientes',
        'Mantenimiento y refactoring de funciones clave.',
        'Fixes internos menores');

    _history += addVersionDetails('Versión 1.75', '11/05/2019',
        'Se agrega funcionalidad para generar cortes por asesor.',
        'Optimización al componente de las requisiciones.',
        'Optimización al componente de envios de ordenes de trabajo.',
        'Se agrega funcionalidad para recepcionar articulos por medio de código de barras.',
        'Se agregan mas detalles al ticket personalizado.',
        'Se agrega funcionalidad para enviar los reportes de venta por correo desde la ventana de reportes.',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 1.35', '29/04/2019',
        'Se agrega componente para recepción de envios (articulos solicitados en las requisiciones).',
        'Se agrega método de pago <b>Anticipo</b>.',
        'Optimización al método de pago <b>Crédito</b>.',
        'Optimización al manejo de ordenes de trabajo',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 1.20', '29/03/2019',
        'Se agrega componente para <b>Requisiciones</b>.',
        'Se agregan funcionalidad para trabajar con <b>Trello</b>.',
        'Se agrega componente para <b>seguimiento de créditos pendientes</b>.',
        'Mejoras a la interfaz de requisiciones para agilizar las solicitudes.',
        'Se habilita <b>envio de comentarios</b> al facturar tickets.',
        'Se mejora proceso para cerrar ventas a crédito.',
        'Ahora se pueden imprimir <b>tickets personalizados</b>.',
        'Mantenimiento de funciones y fixes internos menores.');

    _history += addVersionDetails('Versión 1.10', '21/02/2019',
        'Se agrega componente para <b>Pagos por Transferencia</b>.',
        'Se agregan campos adicionales para especificar tipo de tarjeta.');

    _history += addVersionDetails('Versión 1.0', '18/02/2019',
        'Se implementa el botón <b>Payment</b> para manejar más opciones.',
        'Se agrega componente para las <b>ventas a crédito</b>.',
        'Se agrega implementación de <b>etiquetas</b> para las ventas especiales.',
        'Se agrega funcionalidad para <b>facturar un ticket</b>; al momento o después de cerrada la venta.');

    Swal.fire({
        type: 'info',
        title: 'Histórico de Versiones',
        html: _history,
        grow: 'row',
        confirmButtonText: 'Cerrar',
        allowOutsideClick: true
    }).then((result) => { });
}

function addVersionDetails(title, date, ...updates) {
    let str = "<h3>" + title + " - " + date + "</h3>";
    str += "<ul>";
    for (let i = 0, len = updates.length; i < len; i++) {
        str += "<li>";
        str += "<b>*</b> " + updates[i];
        str += "</li>";
    }
    str += "</ul>";
    str += "<hr />";
    return str;
}

export default class BtnFunctions extends React.Component {
    constructor(props) {
        super(props);
        showOption = showOption.bind(this);
        Poster.on('afterPopupClosed', () => {
            Swal.close();
            location.reload();
        });
    }

    render() {
        clientId = this.props.clientId;
        checkEnableCredit();
        getSolicitante();
        localStorage.setItem('tickets_first_load', 'false');
        checkModulesVersion();
        return (
            <div className="viewBtnFunctions">
                <div id="viewFunctions">
                    <h3>Servicio al cliente</h3>
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(1)}>Actualizar Datos del Cliente</button>
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(2)}>Facturar Ticket</button>
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(4)}>Orden de Trabajo</button>
                    <br />
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(8)}>Manejar Ordenes</button>
                    <button className="btns btn btn-default btn-func" id="btnAdeudosPendientes" onClick={() => showOption(11)}>Pagos Pendientes</button>
                    {/*<button className="btns btn btn-default btn-func" id="btnCreditosPendientes" onClick={() => showOption(5)}>Créditos pendientes</button>
                    <button className="btns btn btn-default btn-func" id="btnAnticiposPendientes" onClick={() => showOption(7)}>Anticipos pendientes</button>*/}
                    <hr />
                    <h3>Operativo</h3>
                    <button className="btns btn btn-default btn-func" id="btnTickets" onClick={() => showOption(10)}>Tickets</button>
                    <button className="btns btn btn-default btn-func" id="btnRequisiciones" onClick={() => showOption(9)}>Historial Requisiciones</button>
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(3)}>Requisición</button>
                    <button className="btns btn btn-default btn-func" onClick={() => showOption(6)}>Recepción de Insumos</button>
                    <hr />
                    {/*<button className="btns btn btn-danger btn-func" onClick={() => showOption(12)}>🔑 Cerrar Caja</button>*/}
                    <button className="btns btn btn-info btn-func" onClick={() => showOption(13)}>Test Contador</button>
                    {/*<button className="btns btn btn-default btn-func">Test</button>*/}
                    <div onClick={showVersionHistory} className="well" id="versionWell">{localStorage.getItem('version')}</div>
                </div>
                <div id="viewFunctionsOption">
                    {View}
                </div>
            </div>
        );
    }
}