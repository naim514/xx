/**
 * MakeCode extension for ESP8266 Wifi modules and ThinkSpeak website https://thingspeak.com/
 */
//% color=#009b5b icon="\uf1eb" block="ESP8266 ThingSpeak"
namespace naim_ESP8266ThingSpeak {

    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let last_upload_successful: boolean = false

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }
    /**
           * Connect to ThingSpeak and upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
           */
    //% block="Upload data to ThingSpeak|URL/IP = %ip|Write API key = %write_api_key|Field 1 = %n1|Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% ip.defl=api.thingspeak.com
    //% write_api_key.defl=your_write_api_key
    export function connectThingSpeak(ip: string, write_api_key: string, n1: number, n2: number, n3: number, n4: number, n5: number, n6: number, n7: number, n8: number) {
        if (wifi_connected && write_api_key != "") {
            thingspeak_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                last_upload_successful = false
                let str: string = "GET /update?api_key=" + write_api_key + "&field1=" + n1 + "&field2=" + n2 + "&field3=" + n3 + "&field4=" + n4 + "&field5=" + n5 + "&field6=" + n6 + "&field7=" + n7 + "&field8=" + n8
                sendAT("AT+CIPSEND=" + (str.length + 2))
                sendAT(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }
    //% group="HTTP Method"
    /**
     * HTTP get method
     */
    //% block="HTTP GET %url|Port %port"
    //% port.defl=443
    export function HTTPGet(url: string, port: number) {
        let inputString = ""
        serial.redirect(
            SerialPin.P8,
            SerialPin.P12,
            BaudRate.BaudRate115200
        )
        serial.setWriteLinePadding(0)
        serial.setTxBufferSize(200)
        serial.setRxBufferSize(200)
        serial.writeLine("GET," + url + "," + port)


        while (1) {
            inputString += serial.readString()
            if (inputString.includes("HTTP_GET_SUCCESS")) {
                break
            }
        }
        inputString = inputString.substr(0, inputString.length - 19)
        serial.redirectToUSB()
        return inputString
    }







    //% group="JSON"
    /**
     * Get data from json string
     */
    //% block="GETFromJson %json|Key %find"
    export function GETFromJson(json: string, find: string) {
        let data = json
        let count = 0
        let text_output: string[] = []
        let text_split: string[] = []
        let substring = ""
        let index = 0
        while (true) {
            index = data.indexOf("\"" + find + "\":")
            if (index != -1) {
                substring = data.substr(index + find.length + 3, data.length - index)
                data = substring
                text_split = substring.split(",")
                text_output[count] = text_split[0]
                count += 1
            } else {
                break;
            }
        }
        return text_output
    }



    /*===============================
    ici debut de read from thingspeak
    */

    /**
    * Connect to ThingSpeak and download data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% block="download data from ThingSpeak|URL/IP = %ip|read API key = %read_api_key%n"
    //% ip.defl=api.thingspeak.com
    //% read_api_key.defl=your_read_api_key
    export function readThingSpeak(ip: string, read_api_key: string) {
        if (wifi_connected && read_api_key != "") {
            thingspeak_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                //    last_upload_successful = false
                let str: string = "GET /channels/1028055/fields/1.json?api_key=" + read_api_key + "&results=1"
                sendAT("AT+CIPSEND=" + (str.length + 2))
                sendAT(str, 0) // download data

                return
                //print(get_data)
                //channel_id = get_data['channel']['id']

                //feild_1 = get_data['feeds']
                //print(feild_1)


                // last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }
    /**===========================================================================
      * ici la fin de read from thingspeak
      */





    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected ?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected ?"
    export function isThingSpeakConnected() {
        return thingspeak_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

}


