// ==UserScript==
// @name         Slot Seeker
// @version      1.0.2
// @grant        none
// @match        https://projects.intra.42.fr/projects/*/slots?team_id=*
// ==/UserScript==

(function() {
    'use strict';

    let retryTimer = null;
    let statusInterval;  
    let submitButton;
    let statusDisplay;
    let isSearching = false;
    let formContainer;

    function generateUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team_id');
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 2);

        const formatDate = (date) => {    
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const start = formatDate(today);
        const end = formatDate(endDate);

        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}.json?team_id=${teamId}&start=${start}&end=${end}`;
    }

    async function fetchJsonData(selectedStart, selectedEnd, retryCount = 0) {
        const jsonUrl = generateUrl();
        console.log('Fetching JSON from:', jsonUrl);

        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const jsonData = await response.json();

            const selectedStartTime = new Date(selectedStart).getTime();
            const selectedEndTime = new Date(selectedEnd).getTime();

            let isSlotAvailable = false;

            jsonData.forEach(slot => {
                const slotStartTime = new Date(slot.start).getTime();
                const slotEndTime = new Date(slot.end).getTime();

                if (selectedStartTime >= slotStartTime && selectedEndTime <= slotEndTime) {
                    clearInterval(statusInterval);
                    submitButton.innerText = 'START';
                    statusDisplay.innerText = '';
                    isSearching = false;
                    alert(`Slot available from ${slot.start} to ${slot.end}`);
                    isSlotAvailable = true;
                }
            });

            if (!isSlotAvailable && retryCount < 20) {
                console.log("No available slots found. Retrying in 10 seconds...");
                retryTimer = setTimeout(() => {
                    fetchJsonData(selectedStart, selectedEnd, retryCount + 1);
                }, 10000); // 10 seconds
            } else if (!isSlotAvailable) {
                alert("No available slots found after 5 minutes.");
                clearInterval(statusInterval);
                submitButton.innerText = 'START';
                statusDisplay.innerText = '';
                isSearching = false;
            }

        } catch (error) {
            console.error('Error fetching JSON data:', error);
            alert('Failed to fetch JSON data.');
            clearInterval(statusInterval);
            submitButton.innerText = 'START';
            statusDisplay.innerText = '';
            isSearching = false;
        }
    }

    function generateTimeOptions(selectBox, offsetMinutes = 0) {
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() + 30 + offsetMinutes);

        const minutes = startTime.getMinutes();
        startTime.setMinutes(Math.ceil(minutes / 15) * 15 % 60);
        if (minutes > 45) startTime.setHours(startTime.getHours() + 1);

        for (let i = 0; i < 30; i++) {
            const option = document.createElement('option');
            const year = startTime.getFullYear();
            const month = String(startTime.getMonth() + 1).padStart(2, '0');
            const day = String(startTime.getDate()).padStart(2, '0');
            const hours = String(startTime.getHours()).padStart(2, '0');
            const mins = String(startTime.getMinutes()).padStart(2, '0');
            const formattedTime = `${year}-${month}-${day}T${hours}:${mins}:00.000+09:00`;

            option.value = formattedTime;
            option.text = `${hours}:${mins}`;
            selectBox.appendChild(option);
            startTime.setMinutes(startTime.getMinutes() + 15);
        }
    }

    function setSecondSelectAfterFirst(selectBox1, selectBox2) {
        selectBox1.addEventListener('change', () => {
            const selectedOption = new Date(selectBox1.value);
            selectedOption.setMinutes(selectedOption.getMinutes() + 30);

            const year = selectedOption.getFullYear();
            const month = String(selectedOption.getMonth() + 1).padStart(2, '0');
            const day = String(selectedOption.getDate()).padStart(2, '0');
            const hours = String(selectedOption.getHours()).padStart(2, '0');
            const mins = String(selectedOption.getMinutes()).padStart(2, '0');

            const formattedTime = `${year}-${month}-${day}T${hours}:${mins}:00.000+09:00`;
            selectBox2.value = formattedTime;
        });
    }

    function createForm() {
        formContainer = document.createElement('div');
        formContainer.style.position = 'fixed';
        formContainer.style.top = '20px';
        formContainer.style.right = '20px';
        formContainer.style.backgroundColor = '#f9f9f9';
        formContainer.style.padding = '20px';
        formContainer.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        formContainer.style.zIndex = '1000';
        formContainer.style.width = '220px';

        const description = document.createElement('p');
        description.innerText = '時間を指定してSTART 見つかったらALERTでおしらせ';
        formContainer.appendChild(description);

        const selectBox1 = document.createElement('select');
        const selectBox2 = document.createElement('select');
        selectBox1.style.marginBottom = '10px';
        selectBox1.style.width = '45%';
        selectBox2.style.marginBottom = '10px';
        selectBox2.style.width = '45%';

        generateTimeOptions(selectBox1, 0);
        generateTimeOptions(selectBox2, 30);

        setSecondSelectAfterFirst(selectBox1, selectBox2);

        const selectContainer = document.createElement('div');
        selectContainer.style.display = 'flex';
        selectContainer.appendChild(selectBox1);
        selectContainer.appendChild(document.createTextNode('〜'));
        selectContainer.appendChild(selectBox2);

        formContainer.appendChild(selectContainer);

        submitButton = document.createElement('button');
        submitButton.innerText = 'START';
        formContainer.appendChild(submitButton);

        statusDisplay = document.createElement('span');
        statusDisplay.style.marginLeft = '10px';
        formContainer.appendChild(statusDisplay);

        // 閉じるボタンを作成
        const closeButton = document.createElement('button');
        closeButton.innerText = 'CLOSE';
        closeButton.style.float = 'right';
        closeButton.style.marginLeft = '10px';
        closeButton.addEventListener('click', () => {
            if (isSearching) {
                clearTimeout(retryTimer);
                clearInterval(statusInterval);
                isSearching = false;
            }
            formContainer.style.display = 'none'; // フォームを非表示にする
        });
        formContainer.appendChild(closeButton);

        submitButton.addEventListener('click', () => {
            if (isSearching) {
                clearTimeout(retryTimer);
                clearInterval(statusInterval);
                submitButton.innerText = 'START';
                statusDisplay.innerText = '';
                isSearching = false;
                alert('検索を停止しました');
            } else {
                const selectedOption1 = selectBox1.value;
                const selectedOption2 = selectBox2.value;
                fetchJsonData(selectedOption1, selectedOption2);

                submitButton.innerText = 'STOP';
                isSearching = true;
                statusDisplay.innerText = '.';

                statusInterval = setInterval(() => {
                    if (statusDisplay.innerText.length >= 10) {
                        statusDisplay.innerText = '.';
                    } else {
                        statusDisplay.innerText += '.';
                    }
                }, 1000);
            }
        });

        document.body.appendChild(formContainer);
    }

    createForm();
})();
