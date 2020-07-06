import TicketPrinter from '../util/TicketPrinter';
import { showNotification_v1 } from '../util/notifications';
import { sendEmailNotification } from '../util/notifications';

let ticketPrinter = new TicketPrinter();

let reprint;

export default class TicketManager {
    /**
     * El tipo de ticket.
     */
    tipo = {
        VENTA: 1,
        CREDITO: 2,
        ANTICIPO: 3,
        ABONO: 4,
        PAGADO: 5,
        INTERNA: 6
    };

    constructor() {
        reprint = this.reprintTicket;
    }

    /**
     * Guarda la información del ticket en el servidor.
     * @param {Number} tipo El tipo de ticket. **1 - Venta, 2 - Credito, 3 - Anticipo, 4 - Abono, 5 - Pagado**
     * @param {JSON} datos Los datos del ticket.
     * @param {Number} id_pago El ID unico del pago.
     * @param {Number} es_abono Indica si una transaccion es abono o no. **0 - No abono (defecto), 1 - Abono**
     */
    async saveTicket(tipo, datos, id_pago, es_abono = 0) {
        await new Promise(resolve => {
            let _data = {
                num_ticket: datos.ticket,
                id_pago: id_pago,
                id_sucursal: Poster.settings.spotId,
                tipo_venta: tipo,
                total: datos.total,
                importe: datos.importe,
                adeudo: datos.adeudo,
                abono: datos.abono,
                cash: datos.cash,
                card: datos.card,
                transfer: datos.transfer,
                cambio: datos.change,
                asesor: datos.asesor,
                cliente: datos.cliente,
                fecha_venta: datos.fecha_venta,
                fecha_abono: datos.fecha_abono,
                fecha_entrega: datos.fecha_entrega,
                es_abono: es_abono,
                detalles: datos.detalles,
                tag: datos.tag,
                json: datos.json,
                descuento_cliente: datos.descuento_cliente
            };

            $.ajax({
                type: 'POST',
                data: _data,
                url: 'url/Pos/guardar_ticket',
                dataType: 'json',
                encoded: true
            }).done(function (data) {
                if (data !== 0) sendEmailNotification("ERROR AL GUARDAR TICKET EN EL SERVIDOR", Poster.settings.spotId, JSON.stringify(_data));
                resolve();
            }).fail(function (xhr, textStatus, errorThrown) {
                console.error('ERROR AL GUARDAR TICKET EN EL SERVIDOR');
                sendEmailNotification("ERROR AL GUARDAR TICKET EN EL SERVIDOR", Poster.settings.spotId, JSON.stringify(_data));
                resolve();
            });
        });
    }

    reprintTicket(num_ticket, id_pago = '', desglosado = false) {
        return new Promise(resolve => {

            let data = {
                num_ticket: num_ticket
            };

            if (id_pago !== '') data.id_pago = id_pago;

            $.ajax({
                type: 'GET',
                data: data,
                url: 'url/Pos/obtener_ticket',
                dataType: 'json',
                encoded: true
            }).done(function (result) {
                if (result && result.length !== 0) {
                    Poster.makeApiRequest('dash.getTransactionProducts?&transaction_id=' + num_ticket, {
                        method: 'get'
                    }, (product_list) => {
                        //console.log(product_list);
                        let datos = {
                            total: Number(result[0].total),
                            importe: Number(result[0].importe),
                            adeudo: Number(result[0].adeudo),
                            abono: Number(result[0].abono),
                            cash: Number(result[0].cash),
                            card: Number(result[0].card),
                            transfer: Number(result[0].transfer),
                            change: Number(result[0].cambio),
                            ticket: num_ticket,
                            asesor: result[0].asesor,
                            cliente: result[0].cliente,
                            fecha_venta: result[0].fecha_venta,
                            fecha_abono: result[0].fecha_abono,
                            fecha_entrega: result[0].fecha_entrega,
                            detalles: result[0].detalles,
                            json: result[0].json,
                            descuento_cliente: result[0].descuento_cliente
                        };

                        switch (Number(result[0].tipo_venta)) {
                            case 1:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.VENTA, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                            case 2:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.CREDITO, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                            case 3:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.ANTICIPO, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                            case 4:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.ABONO, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                            case 5:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.PAGADO, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                            case 6:
                                ticketPrinter.printReceipt(ticketPrinter.tipo.INTERNA, product_list, datos, true, result[0].id_sucursal, desglosado);
                                break;
                        }
                    });
                } else {
                    showNotification_v1('info', 'Información', 'No existe registro asociado a este ticket.');
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                showNotification_v1('info', 'Información', 'No se ha recibido respuesta del servidor.');
            }).always(function () {
                resolve();
            });
        });
    }
}