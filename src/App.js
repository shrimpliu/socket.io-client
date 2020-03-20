import React, { useState } from 'react';
import { Button, Row, Col, Input, Select, List, Switch, Tag } from 'antd';
import io from 'socket.io-client';
import isObject from 'lodash/isObject';
import take from 'lodash/take';
import keys from 'lodash/keys';
import dayjs from 'dayjs';
import ReactJson from 'react-json-view';
import './App.css';

function App() {
  const [scheme, setScheme] = useState("http");
  const [host, setHost] = useState("localhost:8808");
  const [path, setPath] = useState("/io")
  const [socket, setSocket] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState([]);
  const [event, setEvent] = useState("");
  const [payload, setPayload] = useState("");
  const [listens, setListens] = useState({});
  const [listen, setListen] = useState("");

  const toggleConnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(undefined);
    } else {
      const u = `${scheme}://${host}`;
      const socket = io(u, {
        reconnectionAttempts: 5,
        path: path,
      });
      setLoading(true);
      socket.on('connect', () => {
        setSocket(socket);
        setLoading(false);
      });
      socket.on('disconnect', () => {
        setSocket(undefined);
        setLoading(false);
      });
      socket.on('error', err => {
        console.log(err);
        setSocket(undefined);
        setLoading(false);
      });
      socket.on('reconnecting', attemptNumber => {
        appendSystemFlow(`连接失败，正在进行第${attemptNumber}次重连...`);
      });
      socket.on('reconnect_failed', attemptNumber => {
        appendSystemFlow('连接失败, 请检查链接是否正确');
        setSocket(undefined);
        setLoading(false);
      });
    }
  };

  const appendSystemFlow = message => {
    appendFlow({message, color: "#f5222d"});
  };

  const appendServerFlow = message => {
    appendFlow({sender: "服务端", message, color: "#1890ff"});
  };

  const appendClientFlow = message => {
    appendFlow({sender: "客户端", message, color: "#13c2c2"});
  };

  const appendFlow = (flow) => {
    if (flow.sender) {
      flow.time = dayjs().format("HH:mm:ss");
    }
    setFlows(flows => take([flow, ...flows], 100));
  };

  const sendMessage = () => {
    if (socket) {
      socket.emit(event, payload);
      appendClientFlow(getEventMessage(event, payload));
    }
  };

  const listenEvent = () => {
    openListen(listen);
    setListen("");
  };

  const openListen = listen => {
    if (listen && socket) {
      setListens(listens => ({
        ...listens,
        [listen]: true,
      }));
      if (!socket.hasListeners(listen)) {
        socket.on(listen, data => onEvent(listen, data));
      }
    }
  };

  const closeListen = listen => {
    if (listen && socket) {
      setListens(listens => ({
        ...listens,
        [listen]: false,
      }));
      socket.off(listen);
    }
  };

  const toggleListen = listen => {
    if (listens[listen]) {
      closeListen(listen);
    } else {
      openListen(listen);
    }
  };

  const getEventMessage = (event, payload) => (
    <div>
      <Tag color="#87d068">{event}</Tag>
      <div>
        {payload && <span>{payload}</span>}
      </div>
    </div>
  );

  const onEvent = (listen, data) => {
    let payload = "";
    if (data) {
      if(isObject(data)) {
        payload = (
          <ReactJson 
            src={data}
            theme="summerfruit:inverted"
            name={false}
            iconStyle="square"
            indentWidth={2}
            displayDataTypes={false}
            collapsed={true}
          />
        )
      } else {
        payload = data;
      }
    }
    appendServerFlow(getEventMessage(listen, payload));
  };

  return (
    <div className="App">
      <Row gutter={8}>
        <Col span={8} offset={8}>
          <Input.Group compact>
            <Select 
              style={{ width: '16%' }} 
              value={scheme} 
              onChange={v => setScheme(v)} 
              disabled={loading || !!socket}
            >
              <Select.Option value="http">http</Select.Option>
              <Select.Option value="https">https</Select.Option>
            </Select>
            <Input 
              style={{ width: '64%' }}
              value={host} 
              onChange={e => setHost(e.target.value)} 
              placeholder="输入连接地址" 
              disabled={loading || !!socket}
            />
            <Input 
              style={{ width: '20%' }}
              value={path} 
              onChange={e => setPath(e.target.value)} 
              placeholder="输入连接路径" 
              disabled={loading || !!socket}
            />
          </Input.Group>
        </Col>
        <Col span={1}>
          <Button 
            type={!!socket ? "danger" : "primary"}
            onClick={toggleConnect}
            disabled={!host}
            loading={loading}
          >
            {!!socket ? "断开" : "连接"}
          </Button>
        </Col>
      </Row>
      <Row gutter={8} className="space">
        <Col span={4} offset={4}>
          <Row gutter={[4, 8]}>
            <Col span={24} className="space-title">
              发送消息
            </Col>
            <Col>
              <Input 
                value={event} 
                onChange={e => setEvent(e.target.value)} 
                placeholder="输入event" 
                disabled={!socket}
              />
            </Col>
            <Col>
              <Input.TextArea 
                value={payload} 
                rows={4}
                onChange={e => setPayload(e.target.value)} 
                placeholder="输入payload"
                disabled={!socket}
              />
            </Col>
            <Col>
              <Button 
                type={"primary"}
                disabled={!socket || !event}
                loading={loading}
                onClick={sendMessage}
              >
                发送
              </Button>
            </Col>
          </Row>
          <Row gutter={[4, 8]}>
            <Col span={24} className="space-title">
              监听事件
            </Col>
            <Col span={24}>
              <Input 
                value={listen} 
                onChange={e => setListen(e.target.value)} 
                placeholder="输入监听event" 
                disabled={!socket}
              />
            </Col>
            <Col span={24}>
              <Button 
                type={"primary"}
                disabled={!socket || !listen}
                loading={loading}
                onClick={listenEvent}
              >
                添加
              </Button>
            </Col>
            <Col span={24}>
              {keys(listens).map(listen => (
                <Row key={listen} gutter={[4, 4]}>
                <Col span={4}>
                  <Switch checked={listens[listen]} size="small" onClick={() => toggleListen(listen)} />
                </Col>
                <Col span={20}>
                  {listen}
                </Col>
              </Row>
              ))}
            </Col>
          </Row>
        </Col>
        <Col span={9} className="flow">
          <List
            itemLayout="horizontal"
            className="flow-list"
            size="small"
            dataSource={flows}
            renderItem={flow => (
              <List.Item>
                <List.Item.Meta
                  title={flow.sender ? `${flow.sender}  ${flow.time}` : ""}
                  description={
                  <span style={{ color: flow.color }}>{flow.message}</span>
                }
                />
              </List.Item>
            )}
          />
        </Col>
      </Row>
    </div>
  );
}

export default App;
