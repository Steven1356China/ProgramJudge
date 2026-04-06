// Judge0 API 配置
// 注意：在实际部署时，你需要注册 RapidAPI 获取密钥
// 这是免费版本的 API，有调用限制
const JUDGE0_CONFIG = {
    BASE_URL: 'https://judge0-ce.p.rapidapi.com',
    API_KEY: 'YOUR_RAPIDAPI_KEY', // 替换为你的 RapidAPI Key
    HOST: 'judge0-ce.p.rapidapi.com',
    LANGUAGE_IDS: {
        'cpp': 54,    // GCC 9.2.0
        'python': 71  // Python 3.8.1
    }
};

// 提交代码到 Judge0
async function submitCode(code, languageId, stdin) {
    try {
        const response = await fetch(`${JUDGE0_CONFIG.BASE_URL}/submissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': JUDGE0_CONFIG.API_KEY,
                'X-RapidAPI-Host': JUDGE0_CONFIG.HOST
            },
            body: JSON.stringify({
                source_code: btoa(code),
                language_id: parseInt(languageId),
                stdin: btoa(stdin),
                base64_encoded: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // 获取评测结果
        const token = data.token;
        return await getSubmissionResult(token);
    } catch (error) {
        console.error('提交代码失败:', error);
        throw error;
    }
}

// 获取提交结果
async function getSubmissionResult(token) {
    try {
        const response = await fetch(`${JUDGE0_CONFIG.BASE_URL}/submissions/${token}?base64_encoded=true`, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': JUDGE0_CONFIG.API_KEY,
                'X-RapidAPI-Host': JUDGE0_CONFIG.HOST
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // 解码 base64 数据
        const result = {
            status: getStatusDescription(data.status.id),
            time: data.time || 0,
            memory: data.memory || 0,
            stdout: data.stdout ? atob(data.stdout) : null,
            stderr: data.stderr ? atob(data.stderr) : null,
            compile_output: data.compile_output ? atob(data.compile_output) : null,
            exit_code: data.exit_code || 0
        };

        return result;
    } catch (error) {
        console.error('获取结果失败:', error);
        throw error;
    }
}

// 运行代码（无测试用例）
async function runCode(code, languageId, stdin) {
    return await submitCode(code, languageId, stdin);
}

// 提交解决方案（有测试用例）
async function submitSolution(code, languageId, problemId) {
    // 这里需要根据题目ID获取测试数据
    // 这里我们暂时使用模拟数据
    const testCases = getProblemTestCases(problemId);
    
    if (!testCases || testCases.length === 0) {
        throw new Error('找不到该题目的测试数据');
    }
    
    const results = [];
    let allPassed = true;
    
    for (let i = 0; i < Math.min(testCases.length, 3); i++) { // 限制测试用例数量
        const testCase = testCases[i];
        
        try {
            const result = await submitCode(code, languageId, testCase.input);
            
            // 标准化输出进行比较
            const expectedOutput = testCase.output.trim().replace(/\r\n/g, '\n');
            const actualOutput = (result.stdout || '').trim().replace(/\r\n/g, '\n');
            
            const testResult = {
                input: testCase.input,
                expected: expectedOutput,
                actual: actualOutput,
                time: result.time,
                memory: result.memory,
                message: result.compile_output || result.stderr
            };
            
            if (result.status === 'Accepted' && actualOutput === expectedOutput) {
                testResult.result = 'Accepted';
            } else {
                testResult.result = 'Wrong Answer';
                allPassed = false;
                
                if (result.status !== 'Accepted') {
                    testResult.result = result.status;
                } else if (actualOutput !== expectedOutput) {
                    testResult.message = '输出与预期不符';
                }
            }
            
            results.push(testResult);
        } catch (error) {
            results.push({
                result: 'Error',
                message: error.message,
                time: 0,
                memory: 0
            });
            allPassed = false;
        }
    }
    
    return {
        status: allPassed ? 'Accepted' : 'Wrong Answer',
        testCases: results
    };
}

// 获取题目测试数据
function getProblemTestCases(problemId) {
    // 在实际应用中，应该从服务器获取
    // 这里使用硬编码的测试数据
    const testCases = {
        1001: [
            { input: "1 2", output: "3" },
            { input: "5 7", output: "12" },
            { input: "100 200", output: "300" }
        ],
        1002: [
            { input: "5\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
            { input: "1\n1", output: "1" },
            { input: "3\n-1 -2 -3", output: "-1" }
        ]
    };
    
    return testCases[problemId] || [];
}

// 状态码描述映射
function getStatusDescription(statusId) {
    const statusMap = {
        1: 'In Queue',
        2: 'Processing',
        3: 'Accepted',
        4: 'Wrong Answer',
        5: 'Time Limit Exceeded',
        6: 'Compilation Error',
        7: 'Runtime Error',
        8: 'Memory Limit Exceeded',
        9: 'Internal Error'
    };
    return statusMap[statusId] || 'Unknown';
}
