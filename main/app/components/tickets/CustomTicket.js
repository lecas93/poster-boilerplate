import { toFixedTrunc } from '../util/number_format';

function ocultarDetalles() {
    $('#loader_ticket_detalles').show();
    $('#ticket_detalles').hide();
}

function mostrarDetalles() {
    $('#loader_ticket_detalles').hide();
    $('#ticket_detalles').show();
}

async function getInfoVenta(data) {
    console.log('ID:', data.id);

    ocultarDetalles();

    $('#ticket_id').text('Ticket: ' + data.id);
    $('#ticket_asesor').text('Asesor: ' + data.asesor);
    $('#ticket_cliente').text('Cliente: ' + data.client);
    $('#ticket_fecha_venta').text('Fecha venta: ' + data.fecha_venta);
    $('#ticket_total').text('Total: $' + data.total);

    await new Promise(resolve => {
        Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + data.id, {
            method: 'get'
        }, (product_list) => {
            console.log(product_list);
            let len = product_list.length;
            let str_productos = "";
            for (let i = 0; i < len; i++) {
                str_productos += toFixedTrunc(Number(product_list[i].num), 0) + " | " + product_list[i].product_name + " " + (product_list[i].modificator_name !== null ? product_list[i].modificator_name : "") + " $" + (Number(product_list[i].payed_sum) / Number(product_list[i].num)) / 100 + "\n";
                str_productos += "Descuento de producto: " + (product_list[i].discount !== '0' ? (Number(product_list[i].discount)) : 0) + "%";
                if (i !== len - 1) str_productos += "\n\n";
            }
            $('#ticket_productos').text(str_productos);
            resolve();
        });
    });

    mostrarDetalles();
}

export default class CustomTicket extends React.Component {

    constructor(props) {
        super(props);
        getInfoVenta = getInfoVenta.bind(this);
    }

    render() {
        return (
            <div>
                <div className="panel panel-info" onClick={() => { getInfoVenta(this.props) }}>
                    <div className="panel-heading"># {this.props.id}</div>
                    <div className="panel-body">
                        <p className="p-cliente">{this.props.client}</p>
                        <p className="p-total">${this.props.total}</p>
                    </div>
                </div>
            </div>
        );
    }
}