import './style.css';
import '../../venta-credito/lds-roller.css';
import '../../venta-credito/sk-cube.css';
import ErrorAviso from '../../aviso/ErrorAviso';
import PagosManager from '../../util/PagosManager';
import { showNotification } from '../../util/notifications';
import TicketManager from '../TicketManager';
import Swal from 'sweetalert2';

let ticketManager = new TicketManager();

let _PagosManager = null;

let clientId;
let adeudosCliente;
let descuento_cliente = 0;

let tableAdeudos = null;

let asesor_name = "", asesor_id = 0;

function refresh() {
    this.setState();
}

/**
 * Obtiene el ID y nombre del asesor activo.
 */
function getAsesorData() {
    Poster.users.getActiveUser().then((user) => {
        if (!user) {
            return;
        }

        asesor_name = user.name;
        asesor_id = user.id;
    });
}

function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }

        descuento_cliente = client.discount;

        $('#clientAdeudo').text(client.lastname + ' ' + client.firstname + ' ' + client.patronymic);
        localStorage.setItem('client', $('#clientAdeudo').text());
    });
}

function showPagosManager(_data, _tipo) {
    console.log('DATA', _data);
    $('#clientAdeudo').text(_data.nombre_cliente);
    $('#divSelectStatus').hide();
    $('#divTableAdeudos').hide();
    _PagosManager = <PagosManager data={_data} tipo={_tipo} />;
    $('#divPagosManagerAdeudos').show();
    $('#btn-pagos-back').show();
    refresh();
}

function getAdeudos() {
    let status = $('select[id=selectStatus] option:selected').val();
    console.log('status:', status);
    if (status === '-1') return;
    $('#adeudosLoader').show();
    $('#divTableAdeudos').hide();
    $('#div-datos-adeudos').hide();

    $.ajax({
        type: 'POST',
        data: {
            client_id: clientId,
            estado: status,
            asesor_id: asesor_id
        },
        url: 'url/get_adeudos.php',
        dataType: 'json',
        encode: true
    }).done(async function (data) {
        console.log('respuesta ajax:', data)
        adeudosCliente = data;
        tableAdeudos = createTable();
        if (status === '0') await calcularDatosAdeudo(data);
    }).fail(function (xhr, textStatus, errorThrown) {
        showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
    }).always(function () {
        refresh();
        $('#adeudosLoader').hide();
        $('#divTableAdeudos').show();
    });
}

function createTable() {
    let table = [];

    table.push(
        <thead>
            <tr>
                <th>Ticket</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Facturas</th>
                <th>*</th>
            </tr>
        </thead>
    );

    let num_anticipos = adeudosCliente.anticipos.length;
    if (num_anticipos > 0) {
        for (let i = 0; i < num_anticipos; i++) {
            let children = [];
            children.push(<td><a href="#" onClick={() => imprimirTicket(adeudosCliente.anticipos[i].num_ticket)}>{adeudosCliente.anticipos[i].num_ticket}</a></td>);
            children.push(<td>{adeudosCliente.anticipos[i].nombre_cliente}</td>);
            children.push(<td>${adeudosCliente.anticipos[i].monto}</td>);
            children.push(<td>{adeudosCliente.anticipos[i].fecha_venta}</td>);
            children.push(<td>{(adeudosCliente.anticipos[i].pagado === '0' ? 'No pagado' : 'Pagado')}</td>);
            children.push(<td>{"Anticipo"}</td>);
            children.push(<td>{adeudosCliente.anticipos[i].facturas}</td>);
            //children.push(<td><button className="btn btn-success" onClick={() => showPagosManager(adeudosCliente.anticipos[i].num_ticket, adeudosCliente.anticipos[i].monto, "anticipo", adeudosCliente.anticipos[i].nombre_cliente)}>Gestionar</button></td>);
            children.push(<td><button className="btn btn-success" onClick={() => showPagosManager(adeudosCliente.anticipos[i], "anticipo")}>Gestionar</button></td>);
            table.push(<tr>{children}</tr>);
        }
    }

    let num_creditos = adeudosCliente.creditos.length;
    if (num_creditos > 0) {
        for (let i = 0; i < num_creditos; i++) {
            let children = [];
            children.push(<td><a href="#" onClick={() => imprimirTicket(adeudosCliente.creditos[i].num_ticket)}>{adeudosCliente.creditos[i].num_ticket}</a></td>);
            children.push(<td>{adeudosCliente.creditos[i].nombre_cliente}</td>);
            children.push(<td>${adeudosCliente.creditos[i].monto}</td>);
            children.push(<td>{adeudosCliente.creditos[i].fecha_venta}</td>);
            children.push(<td>{(adeudosCliente.creditos[i].pagado === '0' ? 'No pagado' : 'Pagado')}</td>);
            children.push(<td>{"Crédito"}</td>);
            children.push(<td>{adeudosCliente.creditos[i].facturas}</td>);
            children.push(<td><button className="btn btn-success" onClick={() => showPagosManager(adeudosCliente.creditos[i], "credito")}>Gestionar</button></td>);
            table.push(<tr>{children}</tr>);
        }
    }

    return table;
}

function calcularDatosAdeudo(data) {
    return new Promise(async resolve => {
        $('#div-datos-adeudos').hide();
        $('#div-datos-cargando').show();

        let adeudo_total = 0, adeudo_pagado = 0, adeudo_saldo = 0;
        let pagos_ticket = undefined;

        let num_anticipos = data.anticipos.length;
        let num_creditos = data.creditos.length;

        for (let i = 0; i < num_anticipos; i++) {
            adeudo_total += parseFloat(data.anticipos[i].monto);
            pagos_ticket = await getPagos(data.anticipos[i].num_ticket, 'anticipos_cliente');
            if (pagos_ticket) adeudo_pagado += getMontoPagado(pagos_ticket);
        }

        for (let i = 0; i < num_creditos; i++) {
            adeudo_total += parseFloat(data.creditos[i].monto);
            pagos_ticket = await getPagos(data.creditos[i].num_ticket, 'creditos_cliente');
            if (pagos_ticket) adeudo_pagado += getMontoPagado(pagos_ticket);
        }

        adeudo_saldo = adeudo_total - adeudo_pagado;

        $('#h4-adeudo-total').text(adeudo_total.toFixed(2));
        $('#h4-adeudo-pagado').text(adeudo_pagado.toFixed(2));
        $('#h4-adeudo-saldo').text(adeudo_saldo.toFixed(2));
        $('#div-datos-adeudos').show();
        $('#div-datos-cargando').hide();
        resolve();
    });
}

/**
 * Obtiene la lista de pagos realizados a un ticket.
 */
function getPagos(num_ticket, url_list) {
    return new Promise(resolve => {
        $.ajax({
            type: 'POST',
            data: {
                client_id: 0,
                estado: 3,
                num_ticket: num_ticket
            },
            url: 'url' + url_list + '.php',
            dataType: 'json',
            encoded: true
        }).done(function (data) {
            resolve(data);
        }).fail(function (xhr, textStatus, errorThrown) {
            resolve(undefined);
        });
    });
}

function getMontoPagado(pagos) {
    let monto_pagado = 0;
    let len = pagos.length;
    for (let i = 0; i < len; i++) {
        monto_pagado += parseFloat(pagos[i].abono);
    }
    return monto_pagado;
}

function imprimirTicket(numTicket) {
    console.log(numTicket);
    Swal.fire({
        title: 'Procesando...',
        timer: 500,
        allowOutsideClick: false,
        onBeforeOpen: async () => {
            Swal.showLoading();
            Swal.stopTimer();
            await ticketManager.reprintTicket(numTicket);
            Swal.resumeTimer();
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
            Swal.close();
        }
    });
}

function regresarVista() {
    $('#clientAdeudo').text(localStorage.getItem('client'));
    $('#divSelectStatus').show();
    $('#divTableAdeudos').show();
    //_PagosManager = <PagosManager tipo={_tipo} numTicket={num_ticket} monto={_monto} cliente={_cliente} />;
    $('#divPagosManagerAdeudos').hide();
    $('#btn-pagos-back').hide();
    //refresh();
}

export default class AnticipoPendientes extends React.Component {
    constructor(props) {
        super(props);

        refresh = refresh.bind(this);
        getAdeudos = getAdeudos.bind(this);

        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    componentDidMount() {
        $('#btn-pagos-back').hide();
        $('#div-datos-adeudos').hide();
    }

    render() {
        clientId = this.props.clientId;

        if (clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        getAsesorData();
        localStorage.setItem('alreadyLoaded', 'false');
        getClient(clientId);

        return (
            <div>
                <div className="row">
                    <div className="col-sm-9">
                        <h2>Pagos pendientes</h2>
                        <h3>Cliente: <p id="clientAdeudo"></p></h3>
                        <div className="row">
                            <div className="col-sm-12" id="div-datos-cargando" hidden><h4>Calculando montos...</h4></div>
                            <div className="col-sm-12" id="div-datos-adeudos">
                                <h4>Adeudo total: $</h4>
                                <h4 id="h4-adeudo-total" className="adeudo-h4"></h4>
                                <h4>Pagado: $</h4>
                                <h4 id="h4-adeudo-pagado" className="adeudo-h4"></h4>
                                <h4>Saldo: $</h4>
                                <h4 id="h4-adeudo-saldo" className="adeudo-h4"></h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-sm-3">
                        <button id="btn-pagos-back" className="btn btn-primary" onClick={regresarVista}>Regresar</button>
                    </div>
                </div>
                <br />
                <div className="row" id="divSelectStatus">
                    <div className="col-sm-12">
                        Mostrar:
                        <select className="form-control" onChange={getAdeudos} id="selectStatus">
                            <option value="-1">Seleccione una opción</option>
                            <option value="0">No pagados (cliente)</option>
                            <option value="1">Pagados (cliente)</option>
                            <hr />
                            <option value="4">No pagados (Asesor)</option>
                            <option value="5">Pagados (Asesor)</option>
                            {/*<hr/>
                            <option value="2">Todos</option>*/}
                        </select>
                    </div>
                </div>
                <div id="adeudosLoader" hidden>
                    <div className="sk-cube-grid">
                        <div className="sk-cube sk-cube1"></div>
                        <div className="sk-cube sk-cube2"></div>
                        <div className="sk-cube sk-cube3"></div>
                        <div className="sk-cube sk-cube4"></div>
                        <div className="sk-cube sk-cube5"></div>
                        <div className="sk-cube sk-cube6"></div>
                        <div className="sk-cube sk-cube7"></div>
                        <div className="sk-cube sk-cube8"></div>
                        <div className="sk-cube sk-cube9"></div>
                    </div>
                </div>
                <br />
                <div className="row scrollable-adeudos">
                    <div className="col-sm-12">
                        <div id="divTableAdeudos" hidden>
                            <table id="tableAdeudos">
                                {tableAdeudos}
                            </table>
                        </div>
                        <div id="divPagosManagerAdeudos" hidden>
                            {_PagosManager}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}